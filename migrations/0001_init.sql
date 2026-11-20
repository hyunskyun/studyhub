-- 기록 저장소: 컬렉션별 문서(JSON) + 동기화용 메타데이터
-- 삭제는 deleted_at 으로 표시(30일 휴지통), 30일이 지나면 영구 삭제한다.
CREATE TABLE records (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  rev INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (collection, id)
);

CREATE INDEX records_deleted_at ON records (deleted_at);

-- 단일 값 저장 (실행 중인 타이머 등)
CREATE TABLE kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
