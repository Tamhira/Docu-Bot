import { Link, useLocation } from "react-router-dom";

function Navbar() {
  const { pathname } = useLocation();

  const isActive = (path) =>
    pathname === path
      ? "text-white font-semibold"
      : "text-gray-400 hover:text-white transition";

  return (
    <nav className="sticky top-0 z-50 bg-[#0B1620] border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17v-6h6v6m-6-8h6m2 12H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"
            />
          </svg>
          <h1 className="text-lg font-semibold text-white">Docu-bot</h1>
        </div>

        {/* Links */}
        <div className="space-x-12 text-sm flex items-center">
          <Link to="/" className={isActive("/")}>
            Upload
          </Link>
          <Link to="/chat" className={isActive("/chat")}>
            Chatbot
          </Link>
          <Link to="/documents" className={isActive("/documents")}>
            Documents
          </Link>
        </div>

        {/* Profile Image */}
        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-600">
          <img
            src="https://i.pravatar.cc/300"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
