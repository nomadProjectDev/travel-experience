/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from '@/features/capture/StartScreen';
import Canvas from '@/features/studio/Canvas';
import WardrobePanel from '@/features/studio/WardrobePanel';
import LookStack from '@/features/studio/LookStack';
import Alert from '@/shared/ui/Alert';
import sectionHeaderStyles from '@/shared/ui/SectionHeader.module.css';
import Footer from '@/shared/components/Footer';
import { getManifest } from '@config';
import { useTryOnSession } from '@/features/studio/useTryOnSession';
import { cn } from '@/shared/lib/utils';
import BrickStudio from '@/features/effects/BrickStudio';
import appStyles from './App.module.css';

const manifest = getManifest();

const App: React.FC = () => {
  if (manifest.copy.brickStudio) return <BrickStudio />;
  return <ClothingStudio />;
};

const ClothingStudio: React.FC = () => {
  const session = useTryOnSession();
  const { onStartOver } = session;
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoCopy = manifest.copy.videoLoop;
  const videoLoopEnabled = manifest.features.videoLoop;
  const mupiCopy = manifest.copy.mupiStudio;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.info('[web-try-on-mupi] client pack', {
      clientId: manifest.clientId,
      display: manifest.display,
    });
  }, []);

  if (!mupiCopy) {
    throw new Error('The clothing MUPI client pack requires copy.mupiStudio.');
  }

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };
  const railContentSafeAreaStyle: React.CSSProperties = {
    paddingTop: 'max(1.2rem, env(safe-area-inset-top))',
    paddingRight: 'max(1.1rem, calc(env(safe-area-inset-right) + 0.75rem))',
    paddingBottom: 'max(1.2rem, calc(env(safe-area-inset-bottom) + 0.45rem))',
    paddingLeft: 'max(1.1rem, calc(env(safe-area-inset-left) + 0.75rem))',
  };

  return (
    <div className={appStyles.appRoot}>
      <AnimatePresence mode="wait">
        {!session.modelImageUrl ? (
          <motion.div
            key="start-screen"
            className="app-start--mupi"
            /* Opacity-only: a translateY transform makes position:fixed camera
               chrome relative to this box and lets the footer steal shutter hits. */
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <StartScreen
              onBeginCaptureSession={session.onBeginCaptureSession}
              onModelFinalized={session.onModelFinalized}
              onStartLiveTryOn={session.onStartLiveTryOn}
            />
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            className={appStyles.mainView}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <main className={appStyles.shell} aria-busy={session.isLoading}>
              <div className={appStyles.canvasPane}>
                <div className={appStyles.surfaceGlow} aria-hidden />
                <Canvas
                  displayImageUrl={session.displayImageUrl}
                  onStartOver={onStartOver}
                  isLoading={session.isLoading}
                  loadingMessage={session.loadingMessage}
                  error={session.error}
                  isLiveSession={session.isLiveSession}
                  liveStream={session.remoteStream}
                  localPreviewStream={session.localStream}
                  liveVideoRef={liveVideoRef}
                  onCaptureLiveSnapshot={session.onRecordLiveSnapshot}
                  onReturnToLiveStream={session.onReturnToLiveStream}
                  videoLoopUrl={videoLoopEnabled ? session.videoLoopUrl : null}
                  videoError={session.videoError}
                  onDismissVideoError={session.onDismissVideoError}
                  onVideoPlaybackError={session.onVideoPlaybackError}
                  onGenerateVideo={
                    videoLoopEnabled && session.canGenerateLoopVideo
                      ? session.onGenerateLoopVideo
                      : undefined
                  }
                  isVideoGenerating={session.isVideoGenerating}
                  isLoopVideoPending={session.isLoopVideoPending}
                  videoReadyNotice={session.videoReadyNotice}
                  onDismissVideoReadyNotice={session.onDismissVideoReadyNotice}
                  videoCopy={videoCopy}
                  showSfxToggle={false}
                  chromeLabels={{ recapture: mupiCopy.restart, sfxOff: '', sfxOn: '' }}
                />
              </div>

              <aside className={appStyles.rail}>
                <div className={appStyles.railInner} style={railContentSafeAreaStyle}>
                  {session.error ? (
                    <Alert title={mupiCopy.wardrobeTitle} variant="danger">
                      {session.error}
                    </Alert>
                  ) : null}
                  <section className={cn(appStyles.railZone, appStyles.railZoneLook)}>
                    <h2 className={sectionHeaderStyles.railTitle}>{mupiCopy.wardrobeTitle}</h2>
                    <LookStack
                      activeSlots={session.activeSlots}
                      wardrobeById={session.wardrobeById}
                      onToggleSlotVisibility={session.onToggleSlotVisibility}
                      copy={mupiCopy}
                      isBusy={session.isLoading || session.isLiveSession}
                      panel
                    />
                  </section>
                  <section className={cn(appStyles.railZone, appStyles.railZoneWardrobe)}>
                    <WardrobePanel
                      onGarmentSelect={session.onGarmentSelect}
                      activeGarmentIds={session.activeGarmentIds}
                      isLoading={session.isLoading}
                      wardrobe={session.wardrobe}
                      copy={mupiCopy}
                    />
                  </section>
                </div>
              </aside>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {!session.modelImageUrl ? (
        <Footer tone="on-dark" showSfxToggle={false} />
      ) : null}
    </div>
  );
};

export default App;
