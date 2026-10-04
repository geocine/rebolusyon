import { AnimatePresence, motion } from 'motion/react';

export interface BannerData {
  id: number;
  kind: 'rev' | 'unrev' | 'info' | 'warn';
  title: string;
  sub?: string;
}

export function Banner({ banner }: { banner: BannerData | null }) {
  const big = banner && (banner.kind === 'rev' || banner.kind === 'unrev');
  return (
    <AnimatePresence>
      {banner && big && (
        <motion.div key={banner.id} className={`slam slam-${banner.kind}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
          <motion.div
            className="slam-word"
            initial={{ scale: 3.2, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: -4, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          >
            {banner.title}
          </motion.div>
          {banner.sub && (
            <motion.div className="slam-sub" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
              {banner.sub}
            </motion.div>
          )}
        </motion.div>
      )}
      {banner && !big && (
        <motion.div
          key={banner.id}
          className={`toast toast-${banner.kind}`}
          initial={{ y: -30, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: -20, opacity: 0, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <b>{banner.title}</b>
          {banner.sub && <span>{banner.sub}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
