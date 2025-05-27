import { Link } from 'react-router-dom';
import { FaDatabase, FaSearch, FaFileExport } from 'react-icons/fa';
import { GOOGLE_AUTH_URL } from '../api/config';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-3xl font-bold text-green-400">
            X<span className="text-yellow-300">tract</span>
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            to="/login"
            className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 transition-colors"
          >
            Register
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-8">
          Extract Data from Any Website with{" "}
          <span className="text-green-400">X</span>
          <span className="text-yellow-300">tract</span>
        </h1>
        <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-gray-300">
          A powerful web scraping tool that makes data extraction simple, fast,
          and reliable. No coding required.
        </p>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 justify-center">
          <Link
            to="/login"
            className="px-8 py-4 rounded-lg bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-xl font-bold transition-all transform hover:scale-105 shadow-lg"
          >
            Get Started
          </Link>
          <a
            href={GOOGLE_AUTH_URL}
            className="flex items-center justify-center px-8 py-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-xl font-bold transition-all transform hover:scale-105 shadow-lg"
          >
            <FaSearch className="mr-2" /> Sign in with Google
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold mb-16 text-center">
          <span className="text-green-400">Powerful</span> Features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Feature 1 */}
          <div className="bg-gray-800 bg-opacity-50 p-8 rounded-lg border border-gray-700 hover:border-green-400 transition-colors">
            <div className="text-green-400 text-4xl mb-4">
              <FaSearch />
            </div>
            <h3 className="text-2xl font-bold mb-4">Easy Selection</h3>
            <p className="text-gray-300">
              Point and click interface to select exactly what data you want to
              extract. No need to write complex CSS selectors.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-gray-800 bg-opacity-50 p-8 rounded-lg border border-gray-700 hover:border-yellow-400 transition-colors">
            <div className="text-yellow-400 text-4xl mb-4">
              <FaDatabase />
            </div>
            <h3 className="text-2xl font-bold mb-4">Data Management</h3>
            <p className="text-gray-300">
              Save your extractions, organize them, and access them anytime.
              Build a library of data sources.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-gray-800 bg-opacity-50 p-8 rounded-lg border border-gray-700 hover:border-green-400 transition-colors">
            <div className="text-green-400 text-4xl mb-4">
              <FaFileExport />
            </div>
            <h3 className="text-2xl font-bold mb-4">Multiple Formats</h3>
            <p className="text-gray-300">
              Export your data in CSV, JSON, XML, or Excel formats. Ready to use
              in your preferred tools.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-gray-900">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">
            &copy; 2023 Xtract. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;