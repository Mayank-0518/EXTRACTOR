import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaGoogle, FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { register } from '../store/slices/authSlice';
import { GOOGLE_AUTH_URL } from '../api/config';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector(state => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return;
    }
    
    try {
      const resultAction = await dispatch(register({ name, email, password })).unwrap();
      if (resultAction) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleGoogleLogin = () => {
    const state = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('oauth_state', state);
    window.location.href = `${GOOGLE_AUTH_URL}?state=${state}`;
  };

  const pageTransition = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.25,
        duration: 0.8 
      }
    }
  };

  const initialLogoAnimation = {
    hidden: { scale: 3, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring", 
        damping: 15, 
        stiffness: 100,
        duration: 1.5 
      }
    }
  };

  const floatingAnimation = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const slideUpVariants = {
    hidden: { y: 200, opacity: 0 },
    visible: (i: number) => ({ 
      y: 0, 
      opacity: 1, 
      transition: { 
        delay: i * 0.1 + 0.8,
        type: "spring",
        stiffness: 50,
        damping: 15
      } 
    })
  };

  const explosionVariants = {
    hidden: { scale: 0, opacity: 0, rotate: -180 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 70,
        damping: 15,
        delay: 0.3
      }
    }
  };
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative bg-black p-0 m-0">
      {/* Animated background */}
      <div className="fixed inset-0 w-full h-full">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(55,65,81,1)_0%,_rgba(17,24,39,1)_40%,_rgba(0,0,0,1)_100%)]"></div>
        
        <motion.div 
          className="absolute inset-0 opacity-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 1, duration: 2 }}
        >
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-yellow-400"
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
        
        {/* Animated gradient circles */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <motion.div
            initial={{ x: "100%", y: "100%", opacity: 0 }}
            animate={{ x: "20%", y: "30%", opacity: 0.2 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -right-64 -top-64 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-yellow-400/30 to-amber-600/10 blur-3xl"
          />
          <motion.div
            initial={{ x: "-100%", y: "-100%", opacity: 0 }}
            animate={{ x: "-20%", y: "-20%", opacity: 0.15 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -left-64 -bottom-64 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-green-400/20 to-emerald-500/10 blur-3xl"
          />
        </div>
      </div>

      {/* Main content */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={pageTransition}
        initial="hidden"
        animate="visible"
      >
        {/* Initial logo animation */}
        <AnimatePresence>
          {!animationComplete && (
            <motion.div 
              className="fixed inset-0 flex items-center justify-center z-50 bg-black"
              initial={{ opacity: 1 }}
              exit={{ 
                opacity: 0,
                transition: { duration: 0.7, delay: 0.3 }
              }}
            >
              <motion.div
                variants={initialLogoAnimation}
                initial="hidden"
                animate="visible"
                className="text-8xl font-bold"
              >
                <span className="bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 bg-clip-text text-transparent">
                  X<span className="text-yellow-300">tract</span>
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Registration form container */}
        <motion.div
          variants={explosionVariants}
          className="w-full px-6 py-8 relative"
        >
          <motion.div
            className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.7)] relative"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: { 
                height: {
                  delay: 0.6,
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1]
                },
                opacity: { delay: 1.2, duration: 0.6 }
              } 
            }}
          >
            {/* Glow effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[100px] bg-yellow-500/20 blur-3xl rounded-full"></div>
            
            <div className="p-8">
              {/* Logo and header */}
              <div className="text-center mb-8">
                <motion.div
                  variants={floatingAnimation}
                  animate="animate"
                  className="inline-block"
                >
                  <Link to="/" className="inline-block">
                    <span className="text-5xl font-extrabold bg-gradient-to-r from-green-400 via-yellow-300 to-green-400 bg-clip-text text-transparent pb-2">
                      X<span className="text-yellow-300">tract</span>
                    </span>
                  </Link>
                </motion.div>
                
                <motion.h2
                  custom={0}
                  variants={slideUpVariants}
                  className="mt-6 text-3xl font-bold text-white tracking-tight"
                >
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Create Account
                  </span>
                </motion.h2>
                
                <motion.p
                  custom={1}
                  variants={slideUpVariants}
                  className="mt-2 text-gray-400"
                >
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-yellow-400 hover:text-yellow-300 transition-all duration-300 font-medium"
                  >
                    Sign in
                  </Link>
                </motion.p>
              </div>

              {/* Form */}
              <motion.form 
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <motion.div
                  custom={2}
                  variants={slideUpVariants}
                  className="space-y-4"
                >
                  {/* Name field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaUser className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all placeholder-gray-500"
                        placeholder="Enter your name"
                      />
                      <motion.span 
                        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-600"
                        initial={{ width: 0 }}
                        animate={{ width: name ? "100%" : 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaEnvelope className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all placeholder-gray-500"
                        placeholder="Enter your email"
                      />
                      <motion.span 
                        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-600"
                        initial={{ width: 0 }}
                        animate={{ width: email ? "100%" : 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                  
                  {/* Password field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 bg-black/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all placeholder-gray-500"
                        placeholder="Create a password"
                      />
                      <motion.span 
                        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-600"
                        initial={{ width: 0 }}
                        animate={{ width: password ? "100%" : 0 }}
                        transition={{ duration: 0.3 }}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                      </motion.button>
                    </div>
                  </div>

                  {/* Confirm Password field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-10 pr-10 py-3 bg-black/50 border ${
                          confirmPassword && password !== confirmPassword 
                            ? 'border-red-500' 
                            : 'border-white/10'
                        } rounded-xl text-white focus:outline-none focus:ring-2 ${
                          confirmPassword && password !== confirmPassword 
                            ? 'focus:ring-red-500' 
                            : 'focus:ring-yellow-500'
                        } focus:border-transparent transition-all placeholder-gray-500`}
                        placeholder="Confirm your password"
                      />
                      <motion.span 
                        className={`absolute bottom-0 left-0 h-0.5 ${
                          confirmPassword && password !== confirmPassword 
                            ? 'bg-gradient-to-r from-red-500 to-red-600' 
                            : 'bg-gradient-to-r from-yellow-500 to-amber-600'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: confirmPassword ? "100%" : 0 }}
                        transition={{ duration: 0.3 }}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
                      </motion.button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1 text-xs text-red-500"
                      >
                        Passwords don't match
                      </motion.p>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  custom={3}
                  variants={slideUpVariants}
                  className="flex items-center mt-2"
                >
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 border-gray-700 rounded text-yellow-600 focus:ring-yellow-500 bg-black/50"
                  />
                  <label htmlFor="terms" className="ml-2 block text-sm text-gray-300">
                    I agree to the{' '}
                    <a href="#" className="font-medium text-yellow-400 hover:text-yellow-300 transition-all">
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="#" className="font-medium text-yellow-400 hover:text-yellow-300 transition-all">
                      Privacy Policy
                    </a>
                  </label>
                </motion.div>

                <motion.div
                  custom={4}
                  variants={slideUpVariants}
                  className="pt-2"
                >
                  <motion.button
                    type="submit"
                    disabled={Boolean(loading || (confirmPassword && password !== confirmPassword))}
                    className={`group relative w-full flex justify-center py-3 px-4 text-sm font-medium rounded-xl text-black bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] ${
                      (loading || (confirmPassword && password !== confirmPassword)) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                    whileHover={{ scale: (loading || (confirmPassword && password !== confirmPassword)) ? 1 : 1.03, boxShadow: "0 0 30px rgba(245,158,11,0.5)" }}
                    whileTap={{ scale: (loading || (confirmPassword && password !== confirmPassword)) ? 1 : 0.97 }}
                  >
                    <motion.span
                      initial={false}
                      animate={loading ? { 
                        opacity: [1, 0.7, 1],
                        scale: [1, 0.98, 1]
                      } : {}}
                      transition={loading ? { 
                        duration: 1.5, 
                        repeat: Infinity,
                        repeatType: "mirror"
                      } : {}}
                      className="relative z-0 font-semibold"
                    >
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </motion.span>
                    {!loading && (
                      <motion.span
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/40 to-amber-500/40 blur"
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.button>
                </motion.div>

                <motion.div 
                  custom={5}
                  variants={slideUpVariants}
                  className="relative flex items-center py-3"
                >
                  <div className="flex-grow border-t border-gray-800"></div>
                  <span className="flex-shrink mx-4 text-gray-400">Or sign up with</span>
                  <div className="flex-grow border-t border-gray-800"></div>
                </motion.div>

                <motion.div
                  custom={6}
                  variants={slideUpVariants}
                >
                  <motion.button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full flex justify-center items-center py-3 px-4 border border-white/10 rounded-xl shadow-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                    whileHover={{ 
                      scale: 1.02,
                      backgroundColor: "rgba(255,255,255,0.1)"
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      animate={{
                        rotate: [0, 5, 0, -5, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        ease: "easeInOut",
                        times: [0, 0.2, 0.5, 0.8, 1],
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                    >
                      <FaGoogle className="h-5 w-5 mr-3 text-red-400" />
                    </motion.div>
                    Sign up with Google
                  </motion.button>
                </motion.div>
              </motion.form>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;