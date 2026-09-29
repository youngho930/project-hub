"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function NavLink({ href, active, children, className = "" }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent/15 font-semibold text-accent"
          : "text-muted hover:bg-line/60 hover:text-text"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

export default function Sidebar({ groups }) {
  const pathname = usePathname();
  const [closed, setClosed] = useState({});

  const toggle = (name) =>
    setClosed((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col overflow-y-auto border-r border-line bg-card px-4 py-6">
      <Link href="/" className="mb-8 px-3 text-lg font-bold tracking-tight">
        Project Hub
      </Link>

      <NavLink href="/" active={pathname === "/"}>
        전체 보기
      </NavLink>

      <nav className="mt-6 space-y-4">
        {groups.map((group) => {
          const isOpen = !closed[group.name];
          return (
            <div key={group.name}>
              <button
                type="button"
                onClick={() => toggle(group.name)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:text-text"
              >
                <span
                  className={`inline-block transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                >
                  ▸
                </span>
                <span>{group.name}</span>
                <span className="ml-auto font-normal">
                  {group.projects.length}
                </span>
              </button>

              {isOpen && (
                <ul className="mt-1 space-y-0.5">
                  {group.projects.map((project) => {
                    const href = `/projects/${project.id}`;
                    return (
                      <li key={project.id}>
                        <NavLink
                          href={href}
                          active={pathname === href}
                          className="pl-8"
                        >
                          {project.name}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
