"use client";

import { ArrowDown, ArrowRight, Maximize2, X } from "lucide-react";
import Image from "next/image";
import { Fragment, useRef, useState } from "react";

// 절차 시연 캡처: 단계 번호 + 캡처 + 설명을 순서대로.
// 넓은 화면(lg)은 가로로 화살표와 함께, 좁은 화면은 세로로.
// 캡처를 누르면 크게 보기 (<dialog>: Esc·바깥 누르기·닫기 버튼으로 닫힘, 닫으면 누른 캡처로 포커스가 돌아감)
export default function WorkflowGallery({ steps, label }) {
  const dialogRef = useRef(null);
  const [current, setCurrent] = useState(null);

  const open = (index) => {
    setCurrent(index);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const step = current === null ? null : steps[current];

  return (
    <>
      <ol className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-start">
        {steps.map((s, i) => (
          <Fragment key={s.src}>
            {i > 0 && (
              <li aria-hidden="true" className="flex justify-center text-muted lg:mt-24 lg:items-center">
                <ArrowDown size={18} className="lg:hidden" />
                <ArrowRight size={18} className="hidden lg:block" />
              </li>
            )}
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => open(i)}
                aria-label={`${i + 1}단계 ${s.caption} 크게 보기`}
                className="group block w-full text-left"
              >
                <span className="relative block aspect-[4/3] overflow-hidden rounded-xl border border-line bg-inset transition-colors group-hover:border-accent/60 group-focus-visible:border-accent">
                  <Image
                    src={s.src}
                    alt={`${label} ${i + 1}단계: ${s.caption}`}
                    fill
                    sizes="(min-width: 1024px) 22vw, 100vw"
                    className="object-cover object-top"
                  />
                  <span className="absolute right-2 bottom-2 flex size-7 items-center justify-center rounded-md bg-bg/80 text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Maximize2 size={14} />
                  </span>
                </span>
                <span className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-caption text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-body font-semibold">{s.caption}</span>
                </span>
              </button>
            </li>
          </Fragment>
        ))}
      </ol>

      <dialog
        ref={dialogRef}
        aria-label={step ? `${current + 1}단계 ${step.caption}` : "캡처 크게 보기"}
        onClose={() => setCurrent(null)}
        // 바깥(배경) 누르기로 닫기: 대화상자 자체를 누른 경우만
        onClick={(event) => event.target === dialogRef.current && close()}
        className="m-auto max-h-[92vh] w-[min(1100px,94vw)] overflow-hidden rounded-2xl border border-line bg-card p-0 text-text backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      >
        {step && (
          <div className="flex max-h-[92vh] flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-2">
              <p className="text-body">
                <span className="mr-2 font-mono text-caption text-accent">
                  {String(current + 1).padStart(2, "0")}
                </span>
                {step.caption}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="크게 보기 닫기"
                autoFocus
                className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-line/50 hover:text-text"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 overflow-auto">
              {/* 원래 비율 그대로, 잘리지 않게 */}
              <Image
                src={step.src}
                alt={`${label} ${current + 1}단계: ${step.caption}`}
                width={step.width}
                height={step.height}
                sizes="(min-width: 1100px) 1100px, 94vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
