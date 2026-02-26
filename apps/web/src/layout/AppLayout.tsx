import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/planner', label: 'Meal Planner', icon: 'pi pi-calendar-plus' },
  { to: '/meal-suggestions', label: 'Meal Suggestions', icon: 'pi pi-lightbulb' },
  { to: '/inventory', label: 'Inventory', icon: 'pi pi-box' },
  { to: '/meals', label: 'Meals', icon: 'pi pi-book' }
];

export const AppLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-transparent p-4 md:p-6">
      <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        <aside className="hidden rounded-2xl bg-[#14352a] p-5 text-white shadow-xl md:sticky md:top-0 md:block md:max-h-[calc(100vh-3rem)] md:self-start">
          <h1 className="text-xl font-semibold tracking-wide">Meal Planner</h1>
          <p className="mt-1 text-sm text-emerald-100/80">Plan balanced weeks, avoid repeats.</p>
          <nav className="mt-8 flex flex-col gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-medium transition ${
                    isActive ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-white hover:bg-white/20'
                  }`
                }
              >
                <i className={`${link.icon} mr-2`} />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="h-full overflow-y-auto rounded-2xl bg-white/90 p-5 shadow-xl backdrop-blur md:max-h-[calc(100vh-3rem)] md:p-6">
          <div className="mb-3 md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <i className={`pi ${isMobileMenuOpen ? 'pi-times' : 'pi-bars'}`} />
              {isMobileMenuOpen ? 'Close Menu' : 'Menu'}
            </button>
            {isMobileMenuOpen && (
              <div className="mt-3 rounded-xl bg-[#14352a] p-3 text-white shadow-lg">
                <div className="mb-3">
                  <h1 className="text-lg font-semibold tracking-wide">Meal Planner</h1>
                  <p className="mt-1 text-xs text-emerald-100/80">Plan balanced weeks, avoid repeats.</p>
                </div>
                <nav className="flex flex-col gap-2">
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `rounded-xl px-4 py-3 text-sm font-medium transition ${
                          isActive ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-white hover:bg-white/20'
                        }`
                      }
                    >
                      <i className={`${link.icon} mr-2`} />
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
              </div>
            )}
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
