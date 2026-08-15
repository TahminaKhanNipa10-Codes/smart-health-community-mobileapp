import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  PhoneCall, 
  Pill, 
  MapPin, 
  Search, 
  Navigation, 
  ShieldAlert, 
  Activity, 
  Clock, 
  Compass, 
  Sparkles, 
  CheckCircle, 
  HeartPulse,
  X,
  AlertTriangle,
  Info
} from 'lucide-react';

interface EmergencyHospital {
  id: string;
  name: string;
  address: string;
  distance: string;
  phone: string;
  isOpen: boolean;
  emergencyAvailable: boolean;
  traumaLevel?: string;
  icubeds?: number;
  latitude?: number;
  longitude?: number;
}

interface EmergencyAmbulance {
  id: string;
  name: string;
  type: 'national' | 'hospital' | 'private';
  serviceCategory: string;
  phone: string;
  availability: string;
  coverageArea: string;
  isFeatured?: boolean;
}

interface EmergencyPharmacy {
  id: string;
  name: string;
  address: string;
  distance: string;
  phone: string;
  isOpen: boolean;
  is24Seven: boolean;
  latitude?: number;
  longitude?: number;
}

const DEFAULT_HOSPITALS: EmergencyHospital[] = [
  {
    id: 'hosp-1',
    name: 'Dhaka Medical College Hospital (DMCH)',
    address: 'Secretariate Road, Ramna, Dhaka',
    distance: '1.2 km',
    phone: '+880 2-55165088',
    isOpen: true,
    emergencyAvailable: true,
    traumaLevel: 'Level 1 National Trauma & Burn Unit',
    icubeds: 35,
    latitude: 23.7258,
    longitude: 90.3976
  },
  {
    id: 'hosp-2',
    name: 'Square Hospital Ltd.',
    address: '18/F, Bir Uttam Qazi Nuruzzaman Sarak, West Panthapath, Dhaka',
    distance: '2.5 km',
    phone: '+880 1713-333333',
    isOpen: true,
    emergencyAvailable: true,
    traumaLevel: 'Level 1 ER & Critical Care Center',
    icubeds: 22,
    latitude: 23.7531,
    longitude: 90.3817
  },
  {
    id: 'hosp-3',
    name: 'Evercare Hospital Dhaka',
    address: 'Plot 81, Block E, Bashundhara R/A, Dhaka',
    distance: '4.8 km',
    phone: '+880 9666-710678',
    isOpen: true,
    emergencyAvailable: true,
    traumaLevel: 'Comprehensive ER & Trauma Unit',
    icubeds: 18,
    latitude: 23.8103,
    longitude: 90.4312
  },
  {
    id: 'hosp-4',
    name: 'Bangabandhu Sheikh Mujib Medical University (BSMMU)',
    address: 'Shahbag, Dhaka',
    distance: '3.1 km',
    phone: '+880 2-55165760',
    isOpen: true,
    emergencyAvailable: true,
    traumaLevel: 'Specialized Tertiary Emergency Unit',
    icubeds: 15,
    latitude: 23.7388,
    longitude: 90.3958
  },
  {
    id: 'hosp-5',
    name: 'United Hospital Limited',
    address: 'Plot 15, Road 71, Gulshan-2, Dhaka',
    distance: '5.2 km',
    phone: '+880 1914-001234',
    isOpen: true,
    emergencyAvailable: true,
    traumaLevel: '24/7 Cardiac & Emergency Care',
    icubeds: 14,
    latitude: 23.7946,
    longitude: 90.4139
  }
];

const DEFAULT_AMBULANCES: EmergencyAmbulance[] = [
  {
    id: 'amb-1',
    name: 'National Emergency Service (999)',
    type: 'national',
    serviceCategory: 'Universal Police, Fire & Medical Emergency Response',
    phone: '999',
    availability: '24/7 Immediate Dispatch',
    coverageArea: 'Nationwide Bangladesh & All Districts',
    isFeatured: true
  },
  {
    id: 'amb-2',
    name: 'Dhaka Medical College Emergency Ambulance Fleet',
    type: 'hospital',
    serviceCategory: 'ICU & Advanced Cardiac Life Support (ACLS)',
    phone: '+880 2-55165088',
    availability: '24/7 On-Call Fleet',
    coverageArea: 'Greater Dhaka Metropolitan',
    isFeatured: true
  },
  {
    id: 'amb-3',
    name: 'Bangladesh Red Crescent Society Ambulance Unit',
    type: 'hospital',
    serviceCategory: 'Basic Life Support (BLS) & Emergency Transport',
    phone: '+880 2-48310188',
    availability: '24/7 Active Response',
    coverageArea: 'Nationwide & District Headquarters',
    isFeatured: true
  },
  {
    id: 'amb-4',
    name: 'Anjuman Mufidul Islam Ambulance Service',
    type: 'private',
    serviceCategory: 'Low-Cost Emergency Patient Transport',
    phone: '+880 2-9336825',
    availability: '24/7 Rapid Response',
    coverageArea: 'All Districts Bangladesh',
    isFeatured: false
  },
  {
    id: 'amb-5',
    name: 'Al-Markazul Islam Emergency Ambulance',
    type: 'private',
    serviceCategory: 'Oxygen Transport & Inter-District Emergency Service',
    phone: '+880 9611-677677',
    availability: '24/7 Active',
    coverageArea: 'Nationwide Air & Ground Ambulance',
    isFeatured: false
  }
];

const DEFAULT_PHARMACIES: EmergencyPharmacy[] = [
  {
    id: 'pharm-1',
    name: 'Lazz Pharma 24/7 Night Outlet (Kalabagan)',
    address: 'Mirpur Road, Kalabagan, Dhaka',
    distance: '0.6 km',
    phone: '+880 1711-561234',
    isOpen: true,
    is24Seven: true,
    latitude: 23.7485,
    longitude: 90.3802
  },
  {
    id: 'pharm-2',
    name: 'Tamanna Pharmacy 24 Hours',
    address: 'Dhanmondi 27, Dhaka',
    distance: '1.4 km',
    phone: '+880 1819-215566',
    isOpen: true,
    is24Seven: true,
    latitude: 23.7554,
    longitude: 90.3752
  },
  {
    id: 'pharm-3',
    name: 'Al-Shefa Medicine Corner',
    address: 'Shahbag Medical Market, Dhaka',
    distance: '2.2 km',
    phone: '+880 1912-345678',
    isOpen: true,
    is24Seven: true,
    latitude: 23.7390,
    longitude: 90.3962
  },
  {
    id: 'pharm-4',
    name: 'Khidmat 24/7 Chemist & Surgical',
    address: 'Green Road, Farmgate, Dhaka',
    distance: '3.0 km',
    phone: '+880 1715-998877',
    isOpen: true,
    is24Seven: true,
    latitude: 23.7570,
    longitude: 90.3875
  }
];

export default function EmergencyServices() {
  const [activeTab, setActiveTab] = useState<'hospitals' | 'ambulances' | 'pharmacies'>('hospitals');
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitals, setHospitals] = useState<EmergencyHospital[]>([]);
  const [ambulances, setAmbulances] = useState<EmergencyAmbulance[]>([]);
  const [pharmacies, setPharmacies] = useState<EmergencyPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Location States
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  useEffect(() => {
    fetchEmergencyData();
  }, []);

  const fetchEmergencyData = async () => {
    try {
      setLoading(true);
      const [hospSnap, ambSnap, pharmSnap] = await Promise.all([
        getDocs(collection(db, 'emergency_hospitals')).catch(() => null),
        getDocs(collection(db, 'emergency_ambulances')).catch(() => null),
        getDocs(collection(db, 'emergency_pharmacies')).catch(() => null)
      ]);

      const fetchedHospitals: EmergencyHospital[] = [];
      if (hospSnap && !hospSnap.empty) {
        hospSnap.forEach(d => fetchedHospitals.push({ id: d.id, ...d.data() } as EmergencyHospital));
      }

      const fetchedAmbulances: EmergencyAmbulance[] = [];
      if (ambSnap && !ambSnap.empty) {
        ambSnap.forEach(d => fetchedAmbulances.push({ id: d.id, ...d.data() } as EmergencyAmbulance));
      }

      const fetchedPharmacies: EmergencyPharmacy[] = [];
      if (pharmSnap && !pharmSnap.empty) {
        pharmSnap.forEach(d => fetchedPharmacies.push({ id: d.id, ...d.data() } as EmergencyPharmacy));
      }

      setHospitals(fetchedHospitals.length > 0 ? fetchedHospitals : DEFAULT_HOSPITALS);
      setAmbulances(fetchedAmbulances.length > 0 ? fetchedAmbulances : DEFAULT_AMBULANCES);
      setPharmacies(fetchedPharmacies.length > 0 ? fetchedPharmacies : DEFAULT_PHARMACIES);
    } catch (err) {
      console.error('Error fetching emergency services:', err);
      setHospitals(DEFAULT_HOSPITALS);
      setAmbulances(DEFAULT_AMBULANCES);
      setPharmacies(DEFAULT_PHARMACIES);
    } finally {
      setLoading(false);
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    setLocationMessage('Detecting current GPS position...');

    const successHandler = (pos: GeolocationPosition) => {
      setUserCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });
      setDetectingLocation(false);
      setLocationMessage('GPS calibrated! Google Maps directions will start from your exact coordinates.');
    };

    const primaryErrorHandler = (err: GeolocationPositionError) => {
      const errMsg = err?.message || (err?.code === 1 ? 'Permission denied' : err?.code === 2 ? 'Position unavailable' : err?.code === 3 ? 'Timeout' : 'Unknown error');
      console.warn(`GPS detection attempt failed (Code ${err?.code}): ${errMsg}`);

      if (err?.code === 1) {
        // Permission denied - don't retry, inform user immediately
        setDetectingLocation(false);
        setLocationMessage('Location access permission was denied. You can still use address search and directions.');
        return;
      }

      // Retry with maximumAge Infinity for fast cached or coarse position
      navigator.geolocation.getCurrentPosition(
        successHandler,
        (fallbackErr) => {
          const finalMsg = fallbackErr?.message || (fallbackErr?.code === 1 ? 'Permission denied' : fallbackErr?.code === 2 ? 'Position unavailable' : fallbackErr?.code === 3 ? 'Timeout' : 'Unable to retrieve location');
          console.error(`GPS error (Code ${fallbackErr?.code}): ${finalMsg}`);
          setDetectingLocation(false);
          setLocationMessage(`Could not retrieve live GPS location (${finalMsg}). Defaulting to facility address search.`);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: Infinity }
      );
    };

    navigator.geolocation.getCurrentPosition(
      successHandler,
      primaryErrorHandler,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  };

  const getGoogleMapsDirectionsUrl = (placeName: string, address: string) => {
    const dest = encodeURIComponent(`${placeName} ${address}`);
    if (userCoords) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${dest}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${dest}`;
  };

  // Filters
  const filteredHospitals = hospitals.filter(h => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.address.toLowerCase().includes(q) || (h.traumaLevel && h.traumaLevel.toLowerCase().includes(q));
  });

  const filteredAmbulances = ambulances.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.serviceCategory.toLowerCase().includes(q) || a.coverageArea.toLowerCase().includes(q);
  });

  const filteredPharmacies = pharmacies.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-50 md:pl-64 flex flex-col font-sans">
      <Sidebar />

      <main className="p-4 md:p-8 max-w-6xl w-full mx-auto flex-1 relative space-y-6">
        <div className="space-y-6">

          {/* Top Banner & Emergency Hotline Header */}
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-150 shadow-sm relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 shrink-0 shadow-sm">
                    <ShieldAlert className="w-8 h-8" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                        24/7 Response Active
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-0.5">Emergency Services</h1>
                    <p className="text-xs md:text-sm text-slate-500 font-medium">Rapid Emergency Dispatch, Nearby Hospitals & 24/7 Night Pharmacies</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="tel:999"
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-black px-5 py-3 rounded-xl text-sm transition shadow-sm cursor-pointer"
                    id="btn-emergency-call-999"
                  >
                    <PhoneCall className="w-5 h-5 animate-pulse" />
                    <span>Call 999 (National Emergency)</span>
                  </a>

                  <a
                    href="tel:999"
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-rose-700 border border-rose-200 font-bold px-4 py-3 rounded-xl text-xs transition cursor-pointer"
                    id="btn-emergency-call-999-alt"
                  >
                    <PhoneCall className="w-4 h-4 text-rose-600" />
                    <span>Call 999 Hotline</span>
                  </a>
                </div>
              </div>

              {/* GPS Calibration Bar */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {userCoords 
                      ? `GPS Active (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}) - Calibrated for Google Maps`
                      : 'Google Maps directions enabled for all nearby facilities.'}
                  </span>
                </div>

                <button
                  onClick={handleDetectGPS}
                  disabled={detectingLocation}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl font-bold transition text-xs cursor-pointer shadow-sm"
                  id="btn-detect-gps"
                >
                  <Compass className={`w-4 h-4 text-rose-600 ${detectingLocation ? 'animate-spin' : ''}`} />
                  <span>{detectingLocation ? 'Detecting GPS...' : userCoords ? 'Re-detect GPS' : '📍 Use My Current Location'}</span>
                </button>
              </div>

              {locationMessage && (
                <p className="text-[11px] text-rose-600 font-semibold italic">{locationMessage}</p>
              )}
            </div>
          </div>

          {/* Module Sub-Navigation Tabs & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0" id="emergency-module-tabs">
              {[
                { id: 'hospitals', label: '🏥 Nearby Hospitals', icon: Building2, count: hospitals.length, color: 'text-rose-600' },
                { id: 'ambulances', label: '🚑 Ambulance', icon: PhoneCall, count: ambulances.length, color: 'text-amber-600' },
                { id: 'pharmacies', label: '💊 Nearby Pharmacy', icon: Pill, count: pharmacies.length, color: 'text-emerald-600' }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSel = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-2 border ${
                      isSel
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                    }`}
                    id={`tab-emergency-${tab.id}`}
                  >
                    <Icon className={`w-4 h-4 ${isSel ? 'text-white' : tab.color}`} />
                    <span>{tab.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSel ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 md:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                id="input-emergency-search"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* MAIN TAB CONTENT DISPLAY */}
          {loading ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-150 shadow-sm">
              <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-xs font-bold">Scanning emergency health database...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">

              {/* TAB 1: 🏥 NEARBY HOSPITALS */}
              {activeTab === 'hospitals' && (
                <motion.div
                  key="tab-hospitals"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                  id="panel-nearby-hospitals"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-slate-900 text-lg">🏥 Nearby Emergency Hospitals</h2>
                        <p className="text-xs text-slate-500 font-medium">Level 1 & Level 2 Trauma Centers, ICU status & Google Maps directions</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                      {filteredHospitals.length} Found
                    </span>
                  </div>

                  {filteredHospitals.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs font-semibold shadow-sm">
                      No hospitals found matching "{searchQuery}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="hospitals-list">
                      {filteredHospitals.map((hosp) => (
                        <div
                          key={hosp.id}
                          className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                          id={`hospital-card-${hosp.id}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{hosp.name}</h3>
                              <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                hosp.isOpen
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {hosp.isOpen ? '● OPEN 24/7' : 'CLOSED'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                              <span className="font-bold text-slate-800">{hosp.distance}</span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="truncate">{hosp.address}</span>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-rose-700">
                                <Activity className="w-3.5 h-3.5 text-rose-600" />
                                <span>{hosp.traumaLevel || 'Trauma Emergency Care'}</span>
                              </div>
                              {hosp.icubeds !== undefined && (
                                <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{hosp.icubeds} ICU Beds Currently Available</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                            <a
                              href={`tel:${hosp.phone}`}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer shadow-sm"
                              id={`btn-call-hospital-${hosp.id}`}
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Call Hospital</span>
                            </a>

                            <a
                              href={getGoogleMapsDirectionsUrl(hosp.name, hosp.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer border border-slate-200"
                              id={`btn-directions-hospital-${hosp.id}`}
                            >
                              <Navigation className="w-3.5 h-3.5 text-sky-600" />
                              <span>Get Directions</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 2: 🚑 AMBULANCE DIRECTORY */}
              {activeTab === 'ambulances' && (
                <motion.div
                  key="tab-ambulances"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                  id="panel-ambulance-directory"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl">
                        <PhoneCall className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-slate-900 text-lg">🚑 Emergency Ambulance Directory</h2>
                        <p className="text-xs text-slate-500 font-medium">National Emergency (999), Hospital Fleets & Private Critical Care Units</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      {filteredAmbulances.length} Services
                    </span>
                  </div>

                  {filteredAmbulances.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs font-semibold shadow-sm">
                      No ambulance services found matching "{searchQuery}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="ambulances-list">
                      {filteredAmbulances.map((amb) => (
                        <div
                          key={amb.id}
                          className={`rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4 border ${
                            amb.type === 'national' || amb.isFeatured
                              ? 'bg-white border-rose-300 ring-1 ring-rose-200'
                              : 'bg-white border-slate-150 hover:border-amber-300'
                          }`}
                          id={`ambulance-card-${amb.id}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                amb.type === 'national' 
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                  : amb.type === 'hospital'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {amb.type === 'national' ? '🚨 National Emergency' : amb.type === 'hospital' ? '🏥 Hospital Fleet' : '🚑 Private Ambulance'}
                              </span>

                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-emerald-600" />
                                <span>{amb.availability}</span>
                              </span>
                            </div>

                            <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{amb.name}</h3>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <HeartPulse className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>{amb.serviceCategory}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>Coverage: {amb.coverageArea}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <a
                              href={`tel:${amb.phone}`}
                              className={`w-full flex items-center justify-center gap-2 font-black py-2.5 px-3 rounded-xl text-xs transition cursor-pointer shadow-sm ${
                                amb.type === 'national'
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                              }`}
                              id={`btn-call-ambulance-${amb.id}`}
                            >
                              <PhoneCall className="w-4 h-4 animate-pulse text-rose-600" />
                              <span>One-Tap Call ({amb.phone})</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: 💊 NEARBY PHARMACY */}
              {activeTab === 'pharmacies' && (
                <motion.div
                  key="tab-pharmacies"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                  id="panel-nearby-pharmacies"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-slate-900 text-lg">💊 Nearby Pharmacies & Night Chemists</h2>
                        <p className="text-xs text-slate-500 font-medium">24/7 Night Chemist Badges, Open Status & Navigation</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      {filteredPharmacies.length} Found
                    </span>
                  </div>

                  {filteredPharmacies.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs font-semibold shadow-sm">
                      No pharmacies found matching "{searchQuery}".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="pharmacies-list">
                      {filteredPharmacies.map((pharm) => (
                        <div
                          key={pharm.id}
                          className="bg-white rounded-xl border border-slate-150 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                          id={`pharmacy-card-${pharm.id}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{pharm.name}</h3>
                              {pharm.is24Seven ? (
                                <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm flex items-center gap-1 border border-emerald-500">
                                  <Sparkles className="w-3 h-3" />
                                  <span>24/7 BADGE</span>
                                </span>
                              ) : (
                                <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                  Open Daily
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-bold text-slate-800">{pharm.distance}</span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="truncate">{pharm.address}</span>
                            </div>

                            <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Status: {pharm.isOpen ? 'Open Now for Prescriptions' : 'Closed'}</span>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                            <a
                              href={`tel:${pharm.phone}`}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer shadow-sm"
                              id={`btn-call-pharmacy-${pharm.id}`}
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Call Pharmacy</span>
                            </a>

                            <a
                              href={getGoogleMapsDirectionsUrl(pharm.name, pharm.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2.5 px-3 rounded-xl text-xs transition cursor-pointer border border-slate-200"
                              id={`btn-directions-pharmacy-${pharm.id}`}
                            >
                              <Navigation className="w-3.5 h-3.5 text-sky-600" />
                              <span>Get Directions</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          )}

        </div>
      </main>
    </div>
  );
}
