import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaArrowLeft, FaDownload, FaSpinner } from 'react-icons/fa';
import scraperService from '../api/scraperService';

const ExtractionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [extraction, setExtraction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExtraction = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const data = await scraperService.getExtraction(id);
        setExtraction(data);
      } catch (error) {
        toast.error('Failed to load extraction details');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExtraction();
  }, [id, navigate]);

  const handleExport = () => {
    if (!extraction) return;
    
    // Create and download JSON file
    const blob = new Blob([JSON.stringify(extraction.data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${extraction.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Extraction exported as JSON');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <FaSpinner className="text-5xl text-green-400 animate-spin" />
      </div>
    );
  }

  if (!extraction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Extraction not found</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors flex items-center"
        >
          <FaArrowLeft className="mr-2" /> Back to Dashboard
        </button>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{extraction.title}</h1>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md flex items-center"
          >
            <FaDownload className="mr-2" /> Export JSON
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-300">
            URL: <a href={extraction.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{extraction.url}</a>
          </p>
          <p className="text-gray-300">
            Extracted on: {new Date(extraction.createdAt).toLocaleString()}
          </p>
          <p className="text-gray-300">
            Items: {extraction.data.length}
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-800 p-3 flex justify-between items-center">
            <span className="text-sm text-gray-400">Extracted Data</span>
          </div>
          <div className="p-4 font-mono text-sm text-green-300 overflow-x-auto max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extraction.data.map((item: any, index: number) => (
                <div key={index} className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-green-500 transition-colors">
                  {/* Show image if available */}
                  {item.image && (
                    <div className="mb-3">
                      <img 
                        src={item.image} 
                        alt={item.alt || item.title || 'Image'} 
                        className="max-h-40 object-contain mx-auto rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Title */}
                  {item.title && (
                    <h3 className="text-lg font-semibold text-yellow-300 mb-2">{item.title}</h3>
                  )}
                  
                  {/* Price */}
                  {item.price && (
                    <p className="text-green-400 font-bold">{item.price}</p>
                  )}
                  
                  {/* Other properties */}
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    {Object.entries(item).map(([key, value]) => {
                      // Skip already displayed properties and images
                      if (['title', 'price', 'image', 'alt', '_selector'].includes(key)) {
                        return null;
                      }
                      
                      return (
                        <div key={key} className="flex justify-between text-xs mb-1">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white">{String(value).substring(0, 50)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Also show raw data for debugging */}
            <details className="mt-6">
              <summary className="cursor-pointer text-gray-400 hover:text-white transition-colors">
                Show raw JSON data
              </summary>
              <pre className="mt-2 p-2 bg-gray-900 rounded">{JSON.stringify(extraction.data, null, 2)}</pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtractionDetailPage;
