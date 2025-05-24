import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaSearch, FaSignOutAlt } from 'react-icons/fa';
import { useAppDispatch } from '../store/hooks';
import { logout } from '../store/slices/authSlice';

const DashboardPage = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic URL validation
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      let formattedUrl = url;
      // Add https:// if not present
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      setIsLoading(true);
      
      // Encode the URL to pass as a route parameter
      const encodedUrl = encodeURIComponent(formattedUrl);
      navigate(`/result/${encodedUrl}`);
    } catch (error) {
      toast.error('Failed to process URL. Please try again.');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-3xl font-bold text-green-400">
            X<span className="text-yellow-300">tract</span>
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors flex items-center"
        >
          <FaSignOutAlt className="mr-2" /> Logout
        </button>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            Enter a website URL to scrape
          </h1>
          <p className="text-xl mb-12 text-gray-300">
            Xtract will analyze the website and help you select the data you want to extract.
          </p>

          <form onSubmit={handleSubmit} className="mb-12">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL (e.g., example.com)"
                className="flex-1 p-4 rounded-lg bg-gray-700 border border-gray-600 placeholder-gray-400 focus:outline-none focus:border-green-500 text-white"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-4 rounded-lg bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 font-bold transition-all transform hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  'Loading...'
                ) : (
                  <>
                    <FaSearch className="mr-2" /> Scrape
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="bg-gray-800 bg-opacity-50 p-8 rounded-lg border border-gray-700">
            <h3 className="text-2xl font-bold mb-4">Recent Extractions</h3>
            <p className="text-gray-400">
              You don't have any extractions yet. Enter a URL above to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;