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

const targets = { react: pkgDir('react'), 'react-dom': pkgDir('react-dom') };
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
