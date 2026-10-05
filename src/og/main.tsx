import { createRoot } from 'react-dom/client';
import { makeCard } from '../engine/cards';
import { CardView } from '../components/CardView';
import '../styles.css';
import './og.css';

/** The 1200×630 share card. `npm run og` renders this page to public/og.jpg. */
const FAN = [makeCard(0, 0), makeCard(12, 0), makeCard(12, 1), makeCard(12, 2), makeCard(12, 3)];

function OgCard() {
  return (
    <div className="og">
      <div className="og-burst" aria-hidden="true" />
      <div className="og-text">
        <div className="og-eyebrow">A Pusoy Dos game</div>
        <h1 className="og-logo">REBOLUSYON</h1>
        <p className="og-tag">The Filipino take on Big Two. Shed all 13 cards before anyone else.</p>
        <ul className="og-modes">
          <li>
            <span className="og-chip gold">Klasiko</span>
            <span>The classic, played to the last card</span>
          </li>
          <li>
            <span className="og-chip clay">Rebolusyon</span>
            <span>Four of a Kind flips it. 3♣ is king.</span>
          </li>
        </ul>
        <div className="og-foot">
          Play free in your browser <b>rebolusyon.netlify.app</b>
        </div>
      </div>
      <div className="og-fan">
        {FAN.map((c, i) => (
          <div key={c} className="og-slot" style={{ transform: `translateY(${Math.abs(i - 2) * 22}px) rotate(${(i - 2) * 10}deg)` }}>
            <CardView card={c} size="xl" powerCard={i > 0} />
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<OgCard />);
