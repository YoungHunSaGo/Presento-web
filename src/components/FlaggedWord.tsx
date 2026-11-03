import { useId } from 'react';

/** 추임새·반복어 공통 경고 표시. 마우스를 올리거나 포커스하면 말풍선으로 설명. */
export function FlaggedWord({ word, kind, detail, onDark = false }: { word: string; kind: 'FILLER' | 'REPEAT'; detail: string; onDark?: boolean }) {
  const id = useId();
  return (
    <span className={`flag${onDark ? ' on-dark' : ''}`} tabIndex={0} aria-describedby={id}>
      {word}
      <span role="tooltip" id={id} className="flag-tip">
        <strong>{kind === 'FILLER' ? '추임새' : '반복어'}</strong>
        <span>{detail}</span>
      </span>
    </span>
  );
}
