import { z } from 'zod';

/**
 * 공용 zod 유틸 스키마 — 여러 엔티티 model에서 공유하는 검증 규칙의 SSoT.
 * (한쪽 변경 시 import한 모든 model이 자동 반영)
 */

/**
 * ISO-8601 타임스탬프 공용 스키마 — DB `timestamptz`(created_at/updated_at) 매핑.
 * 오프셋 포함('Z' 또는 '+09:00')을 허용한다 ({ offset: true }).
 *
 * NOTE: zod v4.4.3 에서 `z.string().datetime()` 은 `@deprecated` 이며
 *       동일 검증을 수행하는 `z.iso.datetime()` 가 권장 API 다(SSoT로 후자 채택).
 */
export const isoTimestamp = z.iso.datetime({ offset: true });
