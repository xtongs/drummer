import type { Pattern } from "../../types";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import "./Grid.css";

interface GridLabelsProps {
  pattern: Pattern;
  cellSize: number;
}

export function GridLabels({ pattern, cellSize }: GridLabelsProps) {
  const [beatsPerBar] = pattern.timeSignature;
  const totalSubdivisions = pattern.grid[0]?.length || 0;
  const totalWidth = totalSubdivisions * cellSize;

  return (
    <div className="grid-container">
      <div className="grid-wrapper">
        <div className="grid-content" style={{ width: `${totalWidth}px` }}>
          <div className="grid-beat-labels">
            {Array.from({ length: pattern.bars }, (_, barIndex) => {
              const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
              return (
                <div
                  key={barIndex}
                  className="grid-beat-label-group"
                  style={{ width: `${subdivisionsPerBar * cellSize}px` }}
                >
                  {Array.from({ length: beatsPerBar }, (_, beatIndex) => {
                    const beatStart = beatIndex * SUBDIVISIONS_PER_BEAT;

                    return (
                      <div
                        key={beatIndex}
                        className="grid-beat-label"
                        style={{
                          width: `${SUBDIVISIONS_PER_BEAT * cellSize}px`,
                          left: `${beatStart * cellSize}px`,
                        }}
                      >
                        {barIndex + 1}.{beatIndex + 1}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
