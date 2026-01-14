import { Link } from "react-router-dom";

function LandingHeader({ loggedIn }) {
  return (
    <header className="bg-dark flex items-center justify-between px-6 py-5 fixed top-0 w-full z-50">
      <Link to="/">
        <h1 className="text-3xl font-bold text-white">DevCheck</h1>
      </Link>

      <div className="flex items-center gap-4">
        {loggedIn ? (
          <Link
            to="/dashboard"
            className="bg-khaki text-white font-semibold rounded-md text-lg px-4 py-2 transition transform hover:scale-105"
          >
            Back to Dashboard →
          </Link>
        ) : (
          <>
            <Link
              className="bg-green rounded-md text-lg font-semibold text-white px-4 py-2 transition transform hover:scale-105"
              to="/register"
            >
              Register
            </Link>
            <Link
              className="text-green font-semibold text-lg px-4 py-2 transition hover:text-khaki"
              to="/login"
            >
              Login
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export default LandingHeader;
