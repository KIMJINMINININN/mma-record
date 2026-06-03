// link-test-react — 테스트 전 React 단일 인스턴스 보장 (멱등).
//
// 왜 필요한가:
//   모노레포가 node-linker=hoisted 이고, apps/mobile 이 react 19.1.0(Expo/RN)을 고정한다.
//   그 19.1.0 이 root node_modules 로 hoist 되는데, apps/web 은 react 19.2.4 를 쓴다.
//   @testing-library/react 가 (nested copy 가 없을 때) root 의 19.1.0 을 잡으면,
//   컴포넌트(web 19.2.4)와 렌더러(RTL 19.1.0)의 React 인스턴스가 갈려
//   훅 컴포넌트 테스트에서 "Invalid hook call" 이 난다.
//   vitest resolve.alias/dedupe/inline 만으로는 vite(ESM) ↔ Node(CJS) 경계의
//   인스턴스 중복을 못 잡아서, RTL 의 nested react/react-dom 을 web 의 copy 로
//   심볼릭 링크해 단일 인스턴스를 강제한다. fresh install 후에도 test 스크립트가
//   이 파일을 먼저 실행하므로 휴대성이 있다.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..'); // apps/web
const require = createRequire(path.join(webRoot, 'noop.cjs'));

function pkgDir(name) {
  try {
    return path.dirname(require.resolve(`${name}/package.json`));
  } catch {
    let p = path.dirname(require.resolve(name));
    while (p !== path.dirname(p)) {
      const pj = path.join(p, 'package.json');
      if (fs.existsSync(pj) && JSON.parse(fs.readFileSync(pj, 'utf8')).name === name) return p;
      p = path.dirname(p);
    }
    throw new Error(`cannot locate ${name}`);
  }
}

let rtlDir;
try {
  rtlDir = pkgDir('@testing-library/react');
} catch {
  // 테스트 의존성 미설치 → no-op (예: 프로덕션 install)
  process.exit(0);
}

const verOf = (d) => JSON.parse(fs.readFileSync(path.join(d, 'package.json'), 'utf8')).version;
const reactDir = pkgDir('react');
const reactVer = verOf(reactDir);

// (1) react-dom 을 apps/web 에 co-locate (멱등) — clean `pnpm install` 후에도 동작.
//   왜: node-linker=hoisted 라 react-dom(단일 후보)이 root 로 hoist 되는데, root 의 react peer
//   는 apps/mobile 의 19.1.0 이다. vitest.config 는 apps/web/node_modules/react-dom 을 alias 하고
//   이 react-dom 은 외부(비-inline) 모듈로 로드되어 자신의 위치 기준으로 react 를 resolve 한다.
//   root 의 react-dom 을 쓰면 그 react(19.1.0)와 web 컴포넌트(reactVer)의 인스턴스가 갈려
//   테스트에서 "act(...) 경고 + 렌더 null" 이 난다. 그래서 root 의 react-dom 을 apps/web 으로
//   복사하고 nested node_modules(react/scheduler)를 제거해, react-dom 이
//   apps/web/node_modules/react 단일 인스턴스를 walk-up 으로 공유하게 만든다.
const webReactDom = path.join(webRoot, 'node_modules', 'react-dom');
let webReactDomOk = false;
try {
  webReactDomOk =
    verOf(webReactDom) === reactVer &&
    !fs.existsSync(path.join(webReactDom, 'node_modules', 'react'));
} catch {
  webReactDomOk = false;
}
if (!webReactDomOk) {
  fs.rmSync(webReactDom, { recursive: true, force: true }); // 깨진 로컬 제거 → root 로 resolve
  const src = pkgDir('react-dom');
  if (verOf(src) !== reactVer) {
    throw new Error(`[link-test-react] react-dom@${verOf(src)} != react@${reactVer} — 설치 상태 확인 필요`);
  }
  fs.cpSync(src, webReactDom, { recursive: true, dereference: true });
  fs.rmSync(path.join(webReactDom, 'node_modules'), { recursive: true, force: true });
  console.log(`[link-test-react] co-located react-dom@${reactVer} -> node_modules/react-dom (nested react/scheduler 제거)`);
}

// (2) RTL 의 nested react/react-dom 을 web 의 copy 로 심볼릭 링크해 단일 인스턴스 강제.
const targets = { react: reactDir, 'react-dom': webReactDom };
const nm = path.join(rtlDir, 'node_modules');
fs.mkdirSync(nm, { recursive: true });

for (const [name, target] of Object.entries(targets)) {
  const linkPath = path.join(nm, name);
  try {
    if (fs.realpathSync(linkPath) === fs.realpathSync(target)) continue; // 이미 올바름
  } catch {
    /* 없음 → 생성 */
  }
  fs.rmSync(linkPath, { recursive: true, force: true });
  fs.symlinkSync(target, linkPath, 'junction');
  console.log(`[link-test-react] ${path.relative(webRoot, linkPath)} -> ${path.relative(webRoot, target)}`);
}
