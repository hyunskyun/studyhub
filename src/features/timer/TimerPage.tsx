import { useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Coffee, Lock, MonitorSmartphone, Play, Plus, Square, Timer } from 'lucide-react'
import { useAppData } from '../../app/data-context'
import { useNow } from '../../app/useNow'
import { Badge, SubjectDot, TagChips } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Form'
import { Card, EmptyState, PageHeader, PrototypeNotice, Stat } from '../../components/ui/Layout'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { sessionBreakMinutes, sessionStudyMinutes, studyMinutesByDay } from '../../domain/logic'
import { formatClock, formatDay, formatMinutes, formatTime, studyDayOf } from '../../domain/time'
import type { ActiveTimer, ExamTag } from '../../domain/types'
import { SubjectSelect, TagPicker } from '../shared/inputs'
import { ConflictResolver, ManualSessionModal } from './SessionForms'

export default function TimerPage() {
  const now = useNow(1000)
  const { data, subject, subjectName } = useAppData()
  // UI 프로토타입: 타이머 상태는 화면 안에서만 유지 (서버 소유권·복원은 3단계)
  const [timer, setTimer] = useState<ActiveTimer | undefined>(data.activeTimer)
  const [startSubject, setStartSubject] = useState('')
  const [startTags, setStartTags] = useState<ExamTag[]>([])
  const [switchOpen, setSwitchOpen] = useState(false)
  const [switchSubject, setSwitchSubject] = useState('')
  const [switchTags, setSwitchTags] = useState<ExamTag[]>([])
  const [stopOpen, setStopOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [resumeOpen, setResumeOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [conflictId, setConflictId] = useState<string | null>(null)

  const today = studyDayOf(now)
  const todaySessions = data.sessions.filter((s) => studyDayOf(s.start) === today).sort((a, b) => Date.parse(b.start) - Date.parse(a.start))
  const todayStudy = studyMinutesByDay(data.sessions)[today] ?? 0
  const todayBreak = todaySessions.reduce((sum, s) => sum + sessionBreakMinutes(s), 0)
  const plan = timer?.planBlockId ? data.blocks.find((b) => b.id === timer.planBlockId) : undefined
  const planOver = plan && now > Date.parse(plan.end)
  const conflict = data.timerConflicts.find((c) => c.id === conflictId)

  return (
    <>
      <PageHeader
        title="타이머·공부 기록"
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setManualOpen(true)}>
            직접 입력
          </Button>
        }
      />

      {data.timerConflicts.length > 0 && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-warning-soft px-4 py-2.5">
          <AlertTriangle className="size-5 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-sm">
            확정 전 충돌 후보 <b>{data.timerConflicts.length}건</b>이 있습니다. 해결하기 전까지 통계에 포함되지 않습니다.
          </p>
          <Button size="sm" onClick={() => setConflictId(data.timerConflicts[0].id)}>
            해결하기
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          {timer ? (
            <div className="flex flex-col items-center py-4 text-center">
              {!timer.ownedHere && (
                <p className="mb-4 flex items-center gap-1.5 rounded-full bg-subtle px-3 py-1.5 text-sm text-muted">
                  <Lock className="size-4" /> {timer.ownerDeviceName ?? '다른 기기'}에서 실행 중 · 읽기 전용
                </p>
              )}
              <p className="flex items-center gap-2 text-sm font-medium">
                <SubjectDot color={subject(timer.subjectId)?.color} />
                {subjectName(timer.subjectId)}
                <TagChips tags={timer.tags} />
              </p>
              <p className="tabular mt-3 text-6xl font-bold tracking-tight md:text-7xl">{formatClock(now - Date.parse(timer.segmentStart))}</p>
              <p className="mt-2 text-sm text-muted">{timer.breakStart ? `휴식 중 · ${formatClock(now - Date.parse(timer.breakStart))}` : '공부 중'}</p>
              {plan && (
                <p className="mt-3 text-sm text-muted">
                  계획 {formatTime(plan.start)}–{formatTime(plan.end)}과 연결됨
                  {planOver && <span className="ml-1 text-warning">· 계획 시간 초과 기록 중</span>}
                </p>
              )}
              <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-2">
                <Button
                  className="h-10"
                  disabled={!timer.ownedHere}
                  icon={timer.breakStart ? <Play className="size-5" /> : <Coffee className="size-5" />}
                  onClick={() => setTimer({ ...timer, breakStart: timer.breakStart ? undefined : new Date().toISOString() })}
                >
                  {timer.breakStart ? '재개' : '휴식'}
                </Button>
                <Button
                  className="h-10"
                  disabled={!timer.ownedHere || !!timer.breakStart}
                  icon={<ArrowLeftRight className="size-5" />}
                  onClick={() => {
                    setSwitchSubject('')
                    setSwitchTags([])
                    setSwitchOpen(true)
                  }}
                >
                  과목 전환
                </Button>
                <Button className="h-10" variant="danger" disabled={!timer.ownedHere} icon={<Square className="size-5" />} onClick={() => setStopOpen(true)}>
                  종료
                </Button>
              </div>
              {!timer.ownedHere && (
                <Button className="mt-3" variant="primary" onClick={() => setTransferOpen(true)}>
                  이 기기로 가져오기
                </Button>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-4 py-2">
              <p className="text-center text-muted">실행 중인 타이머가 없습니다</p>
              <Field label="과목" required>
                {(id) => <SubjectSelect id={id} value={startSubject} onChange={setStartSubject} />}
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium">수능/내신 태그 (선택)</p>
                <TagPicker value={startTags} onChange={setStartTags} />
              </div>
              <Button
                variant="primary"
                className="h-10 w-full"
                disabled={!startSubject}
                icon={<Play className="size-5" />}
                onClick={() => setTimer({ subjectId: startSubject, tags: startTags, segmentStart: new Date().toISOString(), ownedHere: true })}
              >
                공부 시작
              </Button>
              {data.subjects.length === 0 && <p className="text-center text-xs text-muted">과목이 없습니다. 설정에서 과목을 먼저 추가하세요.</p>}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2" title="오늘 요약">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="자습" value={formatMinutes(todayStudy)} sub="휴식 제외" />
            <Stat label="휴식" value={formatMinutes(todayBreak)} />
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            앱을 닫거나 화면이 잠겨도 시작·전환·휴식 시각으로 경과를 복원합니다. 다시 열면 중단된 동안 공부했는지 확인합니다.
          </p>
          {import.meta.env.DEV && (
            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <p className="text-xs font-semibold text-muted">개발용 상태 미리보기</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setResumeOpen(true)}>
                  재실행 확인
                </Button>
                <Button size="sm" onClick={() => timer && setTimer({ ...timer, ownedHere: !timer.ownedHere, ownerDeviceName: 'iPad' })} disabled={!timer}>
                  다른 기기 소유 전환
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold">오늘 기록</h2>
      <Card padded={false}>
        {todaySessions.length === 0 ? (
          <EmptyState compact icon={<Timer className="size-6" />} title="오늘 공부 기록이 없습니다" description="타이머를 시작하거나 시작·종료 시각을 직접 입력하세요." />
        ) : (
          <ul className="divide-y divide-line">
            {todaySessions.map((s) => (
              <li key={s.id} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 md:px-5">
                <span className="tabular w-28 text-sm text-muted">
                  {formatTime(s.start)}–{formatTime(s.end)}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <SubjectDot color={subject(s.subjectId)?.color} />
                  <span className="truncate">{subjectName(s.subjectId)}</span>
                  <TagChips tags={s.tags} />
                </span>
                <span className="tabular text-sm">{formatMinutes(sessionStudyMinutes(s))}</span>
                {sessionBreakMinutes(s) > 0 && <span className="text-xs text-muted">휴식 {sessionBreakMinutes(s)}분</span>}
                {s.source === 'manual' && <Badge>직접 입력</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="mt-4">
        <PrototypeNotice>타이머 조작은 화면에서만 시연되며 기록으로 저장되지 않습니다.</PrototypeNotice>
      </div>

      {/* 과목 전환: 새 과목 태그·활동 확인 후 확정 시점에 구간 분리 (Q44, Q47, Q76) */}
      <Modal
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        title="과목 전환"
        footer={
          <>
            <Button onClick={() => setSwitchOpen(false)}>취소</Button>
            <Button
              variant="primary"
              disabled={!switchSubject || switchSubject === timer?.subjectId}
              onClick={() => {
                if (timer) setTimer({ ...timer, subjectId: switchSubject, tags: switchTags, planBlockId: undefined, activity: undefined, segmentStart: new Date().toISOString() })
                setSwitchOpen(false)
              }}
            >
              전환 확정
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            지금까지의 {timer && subjectName(timer.subjectId)} 구간은 <b>전환을 확정하는 시점</b>에 마감됩니다.
            {timer?.planBlockId && ' 새 과목 기록은 기존 계획 블록과 연결되지 않습니다.'}
          </p>
          <Field label="새 과목" required>
            {(id) => <SubjectSelect id={id} value={switchSubject} onChange={setSwitchSubject} />}
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">새 과목의 수능/내신 태그</p>
            <TagPicker value={switchTags} onChange={setSwitchTags} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={stopOpen}
        onClose={() => setStopOpen(false)}
        title="공부를 종료할까요?"
        confirmLabel="종료"
        onConfirm={() => {
          setTimer(undefined)
          setStopOpen(false)
        }}
      >
        <p>현재 구간이 공부 기록으로 확정됩니다. 기존 기록과 겹치면 확정 전에 수정 화면이 열립니다.</p>
        <PrototypeNotice />
      </ConfirmDialog>

      {/* 앱 재실행 시 중단 기간 확인 (Q46) */}
      <Modal
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        title="앱이 닫혀 있던 동안"
        footer={
          <>
            <Button onClick={() => setResumeOpen(false)}>휴식으로 처리</Button>
            <Button variant="primary" onClick={() => setResumeOpen(false)}>
              계속 공부했음
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {formatDay(today)} 18:20부터 19:05까지(45분) 앱이 닫혀 있었습니다. 이 시간 동안 공부를 계속했나요? 나중에 기록에서 수정할 수도 있습니다.
        </p>
      </Modal>

      {/* 기기 이전 확인 (Q71, Q148) */}
      <ConfirmDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="타이머를 이 기기로 가져올까요?"
        confirmLabel="가져오기"
        onConfirm={() => {
          if (timer) setTimer({ ...timer, ownedHere: true, ownerDeviceName: undefined })
          setTransferOpen(false)
        }}
      >
        <p className="flex items-start gap-2">
          <MonitorSmartphone className="mt-0.5 size-5 shrink-0 text-muted" />
          계정당 실행 중인 타이머는 하나입니다. 가져오면 이 기기에서 조작하고, 이전 기기는 읽기 전용이 됩니다.
        </p>
      </ConfirmDialog>

      {manualOpen && <ManualSessionModal sessions={data.sessions} onClose={() => setManualOpen(false)} />}
      {conflict && <ConflictResolver candidate={conflict} sessions={data.sessions} onClose={() => setConflictId(null)} />}
    </>
  )
}
