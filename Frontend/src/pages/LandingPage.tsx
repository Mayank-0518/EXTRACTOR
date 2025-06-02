import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaDatabase, FaSearch, FaFileExport, FaGoogle, FaChevronDown, FaArrowRight } from 'react-icons/fa';
import { motion, useScroll, useTransform } from 'framer-motion';
import { GOOGLE_AUTH_URL } from '../api/config';

const LandingPage = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.2,
        delayChildren: 0.3,
        duration: 0.8
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: (custom:any) => ({
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: custom * 0.1
      }
    })
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="fixed inset-0 w-full h-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(55,65,81,1)_0%,_rgba(17,24,39,1)_40%,_rgba(0,0,0,1)_100%)]"></div>
        
        <motion.div 
          className="absolute inset-0 opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 0.5, duration: 2 }}
        >
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-green-400"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                opacity: 0.3 + Math.random() * 0.7,
                scale: 0.5 + Math.random() * 2
              }}
              animate={{ 
                y: [null, Math.random() * -500],
                opacity: [null, 0]
              }}
              transition={{ 
                duration: 5 + Math.random() * 10, 
                repeat: Infinity, 
                delay: Math.random() * 5,
                ease: "linear"
              }}
            />
          ))}
        </motion.div>
        
        <div className="absolute inset-0 overflow-hidden z-0">
          <motion.div
            initial={{ x: "100%", y: "100%", opacity: 0 }}
            animate={{ x: "20%", y: "10%", opacity: 0.15 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -right-64 -top-64 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-green-500/20 to-emerald-600/10 blur-3xl"
          />
          <motion.div
            initial={{ x: "-100%", y: "-100%", opacity: 0 }}
            animate={{ x: "-20%", y: "-10%", opacity: 0.15 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -left-64 -bottom-64 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-600/10 blur-3xl"
          />
        </div>
      </div>

      <div className="relative z-10">
        <motion.nav 
          className="container mx-auto px-6 py-6 flex justify-between items-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div 
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link to="/" className="text-3xl font-extrabold">
              <span className="bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 bg-clip-text text-transparent">
                X<span className="text-yellow-300">tract</span>
              </span>
            </Link>
          </motion.div>

          <div className="flex items-center space-x-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-xl bg-black/20 backdrop-blur-lg border border-white/10 text-white hover:border-green-400/50 hover:text-green-400 transition-all shadow-lg shadow-green-900/20"
              >
                Login
              </Link>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-black font-medium transition-all shadow-lg shadow-green-900/30"
              >
                Register
              </Link>
            </motion.div>
          </div>
        </motion.nav>

        <section className="container mx-auto px-6 pt-20 pb-32 text-center relative">
          <motion.div
            style={{ opacity, scale }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-green-500/10 via-yellow-500/10 to-green-500/10 blur-3xl"></div>
          </motion.div>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
            className="relative z-10"
          >
            <motion.div 
              variants={itemVariants}
              className="inline-block mb-6"
            >
              <motion.span 
                className="px-6 py-2 bg-white/5 backdrop-blur-lg rounded-full text-sm font-medium border border-white/10"
                whileHover={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderColor: "rgba(134, 239, 172, 0.5)",
                  transition: { duration: 0.2 }
                }}
              >
                Web Scraping Made Simple
              </motion.span>
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              className="text-5xl md:text-7xl font-bold mb-8 tracking-tight"
            >
              Extract Data from 
              <br />
              <span className="bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 bg-clip-text text-transparent">
                Any Website
              </span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-gray-300 font-light"
            >
              A powerful web scraping tool that makes data extraction simple, fast,
              and reliable. No coding required.
            </motion.p>
            
            <motion.div 
              variants={itemVariants}
              className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6 justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Link
                  to="/register"
                  className="flex items-center justify-center px-8 py-4 rounded-xl bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-black text-xl font-bold transition-all shadow-xl shadow-green-900/30 hover:shadow-green-900/50"
                >
                  Get Started <FaArrowRight className="ml-2" />
                </Link>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <a
                  href={GOOGLE_AUTH_URL}
                  className="flex items-center justify-center px-8 py-4 rounded-xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-white/20 hover:bg-white/10 text-xl font-medium transition-all shadow-xl shadow-black/50"
                >
                  <FaGoogle className="mr-2" /> Sign in with Google
                </a>
              </motion.div>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              className="mt-16"
            >
              <motion.a
                href="#features"
                className="inline-flex flex-col items-center text-gray-400 hover:text-white transition-colors"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-sm mb-2">Learn More</span>
                <FaChevronDown />
              </motion.a>
            </motion.div>
          </motion.div>
        </section>

        <section id="features" className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-16 text-center"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-green-400 to-yellow-300 bg-clip-text text-transparent">
                Powerful
              </span> Features
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to extract, analyze, and export data from any website
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <motion.div 
              custom={0}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-black/20 backdrop-blur-xl p-8 rounded-2xl border border-white/5 hover:border-green-400/30 transition-all shadow-xl"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/30 to-green-700/30 flex items-center justify-center mb-6">
                <FaSearch className="text-green-400 text-2xl" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Easy Selection</h3>
              <p className="text-gray-400">
                Point and click interface to select exactly what data you want to
                extract. No need to write complex CSS selectors.
              </p>
            </motion.div>


            <motion.div
              custom={1}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-black/20 backdrop-blur-xl p-8 rounded-2xl border border-white/5 hover:border-yellow-400/30 transition-all shadow-xl"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500/30 to-amber-700/30 flex items-center justify-center mb-6">
                <FaDatabase className="text-yellow-400 text-2xl" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Data Management</h3>
              <p className="text-gray-400">
                Save your extractions, organize them, and access them anytime.
                Build a library of data sources.
              </p>
            </motion.div>

            <motion.div
              custom={2}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-black/20 backdrop-blur-xl p-8 rounded-2xl border border-white/5 hover:border-green-400/30 transition-all shadow-xl"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/30 to-green-700/30 flex items-center justify-center mb-6">
                <FaFileExport className="text-green-400 text-2xl" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Multiple Formats</h3>
              <p className="text-gray-400">
                Export your data in CSV, JSON, XML, or Excel formats. Ready to use
                in your preferred tools.
              </p>
            </motion.div>
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          className="container mx-auto px-6 py-24 text-center relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-yellow-500/5 rounded-3xl blur-xl"></div>
          <div className="relative z-10 bg-black/20 backdrop-blur-xl rounded-3xl px-8 py-16 border border-white/5">
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-green-400 to-yellow-300 bg-clip-text text-transparent">
              Ready to extract data?
            </h2>
            <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
              Sign up today and start extracting the data you need in minutes
            </p>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="inline-block"
            >
              <Link
                to="/register"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-black text-xl font-bold transition-all shadow-xl shadow-green-900/30"
              >
                Create Free Account
              </Link>
            </motion.div>
          </div>
        </motion.section>

        <footer className="py-12 border-t border-gray-800/50">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="mb-6 md:mb-0"
              >
                <span className="text-2xl font-bold bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 bg-clip-text text-transparent">
                  X<span className="text-yellow-300">tract</span>
                </span>
              </motion.div>
              
              <div className="text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Xtract. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;