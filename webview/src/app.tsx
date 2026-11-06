import type { BattleStageId } from '@extension/battle/battle';
import type { ViewSnapshot } from '@extension/shared/protocol';
import { useEffect, useReducer, useState } from 'preact/hooks';
import type { HostBridge } from './bridge';
import { BattleScreen } from './screens/battle-screen';
import { HomeScreen } from './screens/home-screen';
import { ResultScreen } from './screens/result-screen';
import { StageScreen } from './screens/stage-screen';

type AppProps = {
  bridge: HostBridge;
};

export function App({ bridge }: AppProps) {
  const [snapshot, setSnapshot] = useState<ViewSnapshot>();
  // 전투 종료 시각이 지나면 snapshot 응답을 기다리지 않고 결과 화면으로 다시 계산한다.
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => setSnapshot(message.snapshot));
    bridge.postMessage({ type: 'ready' });
    return unsubscribe;
  }, [bridge]);

  return (
    <div class="pixel-shell">
      <div class="pixel-viewport">
        <div class="pixel-canvas">
          {snapshot && (
            <Screen
              snapshot={snapshot}
              bridge={bridge}
              onBattleFinished={() => {
                bridge.postMessage({ type: 'battleFinished' });
                rerender(undefined);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

type ScreenProps = {
  snapshot: ViewSnapshot;
  bridge: HostBridge;
  onBattleFinished: () => void;
};

function Screen({ snapshot, bridge, onBattleFinished }: ScreenProps) {
  const { battle } = snapshot;
  if (!battle) {
    return <HomeScreens snapshot={snapshot} bridge={bridge} />;
  }

  const { record, stage } = battle;
  if (Date.now() >= record.startedAt + record.durationMs) {
    return (
      <ResultScreen
        battle={record}
        stage={stage}
        onClaimReward={() => bridge.postMessage({ type: 'claimBattleReward' })}
      />
    );
  }
  return (
    <BattleScreen key={record.id} battle={record} stage={stage} onFinished={onBattleFinished} />
  );
}

function HomeScreens({ snapshot, bridge }: Omit<ScreenProps, 'onBattleFinished'>) {
  const [view, setView] = useState<'home' | 'stage'>('home');
  const [selectedStageId, setSelectedStageId] = useState<BattleStageId>(snapshot.stage.id);

  if (view === 'stage') {
    return (
      <StageScreen
        fields={snapshot.fields}
        stages={snapshot.stages}
        selectedStageId={selectedStageId}
        onSelectStage={setSelectedStageId}
        onStartBattle={(stageId) => bridge.postMessage({ type: 'startBattle', stageId })}
        onBack={() => setView('home')}
      />
    );
  }
  return (
    <HomeScreen
      pet={snapshot.pet}
      onFeed={() => bridge.postMessage({ type: 'feed' })}
      onOpenStage={() => setView('stage')}
    />
  );
}
