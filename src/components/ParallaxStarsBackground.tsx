import React, { useMemo } from 'react';

export interface ParallaxStarsBackgroundProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
  speed?: number;
}

const generateBoxShadows = (n: number) => {
  let value = `${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #FFF`;
  for (let i = 2; i <= n; i++) {
    value += `, ${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #FFF`;
  }
  return value;
};

export function ParallaxStarsBackground({
  title = "LINK\nVAULT",
  children,
  className = "",
  speed = 1,
}: ParallaxStarsBackgroundProps) {
  const shadowsSmall = useMemo(() => generateBoxShadows(700), []);
  const shadowsMedium = useMemo(() => generateBoxShadows(200), []);
  const shadowsBig = useMemo(() => generateBoxShadows(100), []);

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-space-deepest font-sans ${className}`}>
      <style>{`
        .bg-radial-space {
          background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%);
        }
        @keyframes animStar {
          from { transform: translateY(0px); }
          to { transform: translateY(-2000px); }
        }
      `}</style>

      <div className="absolute inset-0 bg-radial-space z-0" />

      {/* Stars Layer 1 — small, fast */}
      <div
        className="absolute left-0 top-0 w-[1px] h-[1px] bg-transparent z-10"
        style={{ boxShadow: shadowsSmall, animation: `animStar ${50 / speed}s linear infinite` }}
      >
        <div className="absolute top-[2000px] w-[1px] h-[1px] bg-transparent" style={{ boxShadow: shadowsSmall }} />
      </div>

      {/* Stars Layer 2 — medium */}
      <div
        className="absolute left-0 top-0 w-[2px] h-[2px] bg-transparent z-10"
        style={{ boxShadow: shadowsMedium, animation: `animStar ${100 / speed}s linear infinite` }}
      >
        <div className="absolute top-[2000px] w-[2px] h-[2px] bg-transparent" style={{ boxShadow: shadowsMedium }} />
      </div>

      {/* Stars Layer 3 — large, slow */}
      <div
        className="absolute left-0 top-0 w-[3px] h-[3px] bg-transparent z-10"
        style={{ boxShadow: shadowsBig, animation: `animStar ${150 / speed}s linear infinite` }}
      >
        <div className="absolute top-[2000px] w-[3px] h-[3px] bg-transparent" style={{ boxShadow: shadowsBig }} />
      </div>

      <div className="absolute top-1/2 left-0 right-0 -mt-[60px] text-center z-20 px-4">
        <h1 className="font-light text-[30px] md:text-[50px] tracking-[10px] leading-tight">
          {title.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              <span className="text-gradient-space">{line}</span>
              {i < title.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </h1>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </div>
  );
}

export default ParallaxStarsBackground;
