// Isolated so tests can mock the hard redirect that jsdom doesn't implement.
const PUBLIC_PATHS = ["/", "/login", "/register"];

// Called when a session can't be recovered. Public pages (e.g. the landing page,
// which probes /user/ for logged-in state) stay put instead of bouncing to login.
export const redirectToLogin = () => {
  if (!PUBLIC_PATHS.includes(window.location.pathname)) {
    window.location.assign("/login");
  }
};
