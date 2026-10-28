import { useState } from "react";
import type { FacetResponse } from "../types";
import Filters from "./Filters";

interface ShopFiltersProps {
  facets: FacetResponse | null;
  loading: boolean;
  searchParams: URLSearchParams;
  onUpdate: (updater: (prev: URLSearchParams) => URLSearchParams) => void;
  onClearAll: () => void;
  activeCount: number;
}

export default function ShopFilters(props: ShopFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm tracking-wider uppercase border border-stone-200 rounded-md hover:border-amber-800 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M7 12h10M10 18h4"
            />
          </svg>
          Filters
          {props.activeCount > 0 && (
            <span className="ml-1 text-xs bg-amber-800 text-white rounded-full w-5 h-5 flex items-center justify-center">
              {props.activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-[150] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 top-16 bg-white rounded-t-2xl shadow-xl flex flex-col animate-[dialogIn_0.2s_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h2 className="text-sm tracking-wider uppercase text-stone-800 font-medium">
                Filters
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-2 -mr-2 text-stone-500 hover:text-stone-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Reuse the same Filters component, but without the sticky wrapper */}
              <div className="[&>aside]:!block [&>aside]:!w-full [&>aside>div]:!static">
                <Filters {...props} />
              </div>
            </div>

            <div className="border-t border-stone-200 px-5 py-4">
              <button
                onClick={() => setOpen(false)}
                className="w-full py-3 bg-amber-900 text-white text-sm tracking-wider uppercase rounded-md hover:bg-amber-800 transition-colors"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
