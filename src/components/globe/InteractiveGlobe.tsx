import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import worldAtlasData from 'world-atlas/countries-110m.json';
import {
  Globe2,
  Search,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Compass,
  MapPin,
} from 'lucide-react';
import type { CountryMetadata } from '../../types/contracts';
import { getCatalogueForCountry } from '../../data/verified-examples';

export interface InteractiveGlobeProps {
  countries: CountryMetadata[];
  selectedCountryCode: string | null;
  onSelectCountry: (country: CountryMetadata) => void;
  reducedMotion?: boolean;
}

type FilterMode = 'all' | 'supported';

interface ProjectedCountryPin {
  country: CountryMetadata;
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Checks whether a WebGL rendering context can be safely created in the current environment.
 * Returns false in headless jsdom or restricted environments.
 */
function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  // In jsdom or test environments, userAgent typically includes jsdom
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl && typeof (gl as WebGLRenderingContext).getShaderPrecisionFormat === 'function');
  } catch {
    return false;
  }
}

/**
 * Converts spherical (lat, lng) in degrees to 3D Cartesian coordinates on a sphere of radius R.
 * Aligns with d3-geo orthographic convention where (lat=0, lng=0) faces +Z.
 */
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (lat * Math.PI) / 180;
  const lam = (lng * Math.PI) / 180;
  const x = radius * Math.cos(phi) * Math.sin(lam);
  const y = radius * Math.sin(phi);
  const z = radius * Math.cos(phi) * Math.cos(lam);
  return new THREE.Vector3(x, y, z);
}

/**
 * Checks whether a (lat, lng) point is on the visible front hemisphere given current rotation [rotLng, rotLat].
 */
function isPointOnVisibleHemisphere(
  lat: number,
  lng: number,
  rotLng: number,
  rotLat: number
): boolean {
  const centerLng = -rotLng;
  const centerLat = -rotLat;
  const phi1 = (lat * Math.PI) / 180;
  const phi2 = (centerLat * Math.PI) / 180;
  const dLam = ((lng - centerLng) * Math.PI) / 180;
  const cosAngle =
    Math.sin(phi1) * Math.sin(phi2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.cos(dLam);
  return cosAngle > -0.05;
}

export const InteractiveGlobe: React.FC<InteractiveGlobeProps> = ({
  countries,
  selectedCountryCode,
  onSelectCountry,
  reducedMotion = false,
}) => {
  // System reduced motion media query check
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    return undefined;
  }, []);

  const effectiveReducedMotion = Boolean(reducedMotion || systemReducedMotion);

  // Rotation state: [lambda (longitude rotation), phi (latitude tilt)] in degrees
  const [rotation, setRotation] = useState<[number, number]>([25, -22]);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(!effectiveReducedMotion);
  const [hoveredCountryCode, setHoveredCountryCode] = useState<string | null>(null);

  // Country selector sidebar state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Drag interaction state
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number; rot: [number, number] }>({
    x: 0,
    y: 0,
    rot: [25, -22],
  });

  // WebGL canvas ref
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Sync reducedMotion prop changes to auto-rotation
  useEffect(() => {
    if (effectiveReducedMotion) {
      setIsAutoRotating(false);
    }
  }, [effectiveReducedMotion]);

  // Smoothly rotate globe to selected country when selectedCountryCode changes
  useEffect(() => {
    if (!selectedCountryCode) return;
    const target = countries.find((c) => c.code === selectedCountryCode);
    if (!target) return;

    const targetRot: [number, number] = [
      -target.coordinates.lng,
      Math.max(-65, Math.min(65, -target.coordinates.lat)),
    ];

    if (effectiveReducedMotion || typeof window === 'undefined') {
      setRotation(targetRot);
      return;
    }

    let frameId: number | null = null;
    const startTime = performance.now();
    const duration = 550;

    setRotation((prevRot) => {
      const startRot: [number, number] = [prevRot[0], prevRot[1]];
      // Shortest angular distance for longitude
      let dLng = ((targetRot[0] - startRot[0] + 540) % 360) - 180;
      const dLat = targetRot[1] - startRot[1];

      const animateStep = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        // Cubic ease-out
        const ease = 1 - Math.pow(1 - t, 3);
        setRotation([startRot[0] + dLng * ease, startRot[1] + dLat * ease]);
        if (t < 1) {
          frameId = window.requestAnimationFrame(animateStep);
        }
      };

      frameId = window.requestAnimationFrame(animateStep);
      return prevRot;
    });

    return () => {
      if (frameId !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [selectedCountryCode, countries, effectiveReducedMotion]);

  // Auto-rotation animation loop
  useEffect(() => {
    if (!isAutoRotating || effectiveReducedMotion) return;
    if (typeof window === 'undefined') return;

    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - lastTime);
      lastTime = now;
      if (!isDraggingRef.current) {
        setRotation(([lng, lat]) => [((lng - dt * 0.008 + 540) % 360) - 180, lat]);
      }
      animId = window.requestAnimationFrame(tick);
    };

    animId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(animId);
    };
  }, [isAutoRotating, effectiveReducedMotion]);

  // Decode world-atlas TopoJSON once
  const worldFeatures = useMemo(() => {
    const topology = worldAtlasData as unknown as Topology<{
      countries: GeometryCollection;
      land: GeometryCollection;
    }>;
    const countriesGeo = topojson.feature(
      topology,
      topology.objects.countries
    ) as FeatureCollection<Geometry, { name?: string }>;
    const graticule = geoGraticule10();
    return {
      countries: countriesGeo.features,
      graticule,
    };
  }, []);

  // Fast lookup maps by isoNumeric and country code
  const countryByIsoNumeric = useMemo(() => {
    const map = new Map<string, CountryMetadata>();
    for (const c of countries) {
      if (c.isoNumeric) {
        map.set(c.isoNumeric, c);
      }
    }
    return map;
  }, [countries]);

  // Optional Three.js WebGL 3D atmospheric sphere layer enhancement
  useEffect(() => {
    const canUseWebGL = detectWebGLSupport();
    const canvas = webglCanvasRef.current;
    if (!canUseWebGL || !canvas) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setSize(520, 520);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0, 3.6);
      cameraRef.current = camera;

      const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.75);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xe0f2fe, 1.35);
      dirLight.position.set(3, 2, 4);
      scene.add(dirLight);

      const rimLight = new THREE.DirectionalLight(0x10b981, 0.65);
      rimLight.position.set(-3, -2, -2);
      scene.add(rimLight);

      const globeGroup = new THREE.Group();
      globeGroupRef.current = globeGroup;
      scene.add(globeGroup);

      // Core ocean sphere
      const sphereGeo = new THREE.SphereGeometry(1, 48, 48);
      const sphereMat = new THREE.MeshPhongMaterial({
        color: 0x071326,
        emissive: 0x040d1a,
        specular: 0x1e3a8a,
        shininess: 28,
        transparent: true,
        opacity: 0.92,
      });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      globeGroup.add(sphereMesh);

      // Subtle wireframe graticule shell in 3D
      const wireGeo = new THREE.SphereGeometry(1.003, 24, 18);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
      });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      globeGroup.add(wireMesh);

      // 3D beacons for each country
      countries.forEach((country) => {
        const pos = latLngToVector3(country.coordinates.lat, country.coordinates.lng, 1.015);
        const beaconGeo = new THREE.SphereGeometry(country.supported ? 0.022 : 0.014, 12, 12);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: country.supported ? 0x10b981 : 0x64748b,
        });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.copy(pos);
        globeGroup.add(beacon);
      });

      renderer.render(scene, camera);

      return () => {
        sphereGeo.dispose();
        sphereMat.dispose();
        wireGeo.dispose();
        wireMat.dispose();
        renderer?.dispose();
      };
    } catch {
      // Fallback cleanly to SVG orthographic layer if WebGL context fails
      return undefined;
    }
  }, [countries]);

  // Keep Three.js globe orientation synchronized with rotation and zoomScale
  useEffect(() => {
    const globeGroup = globeGroupRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!globeGroup || !renderer || !camera) return;

    const [rotLng, rotLat] = rotation;
    globeGroup.rotation.y = (rotLng * Math.PI) / 180;
    globeGroup.rotation.x = (-rotLat * Math.PI) / 180;
    globeGroup.scale.setScalar(zoomScale);

    if (globeGroup.parent) {
      renderer.render(globeGroup.parent, camera);
    }
  }, [rotation, zoomScale]);

  // Compute D3 Orthographic projection for crisp vector continents, borders, and accessible country pins
  const svgSize = 520;
  const baseRadius = 212;
  const currentRadius = baseRadius * zoomScale;

  const projection = useMemo(() => {
    return geoOrthographic()
      .scale(currentRadius)
      .translate([svgSize / 2, svgSize / 2])
      .rotate([rotation[0], rotation[1], 0])
      .clipAngle(90);
  }, [currentRadius, rotation]);

  const pathGenerator = useMemo(() => {
    return geoPath(projection);
  }, [projection]);

  const graticulePath = useMemo(() => {
    return pathGenerator(worldFeatures.graticule) || '';
  }, [pathGenerator, worldFeatures.graticule]);

  const renderedCountryPaths = useMemo(() => {
    return worldFeatures.countries.map((feature: Feature<Geometry>, idx: number) => {
      const d = pathGenerator(feature);
      if (!d) return null;
      const rawId = feature.id !== undefined ? String(feature.id).padStart(3, '0') : '';
      const matchedCountry = countryByIsoNumeric.get(rawId);
      return {
        key: `${rawId || idx}-${idx}`,
        d,
        matchedCountry,
      };
    });
  }, [worldFeatures.countries, pathGenerator, countryByIsoNumeric]);

  // Project every CountryMetadata into 2D screen coordinates on the globe
  const projectedPins: ProjectedCountryPin[] = useMemo(() => {
    return countries.map((country) => {
      const visible = isPointOnVisibleHemisphere(
        country.coordinates.lat,
        country.coordinates.lng,
        rotation[0],
        rotation[1]
      );
      const projected = projection([country.coordinates.lng, country.coordinates.lat]);
      if (projected && visible) {
        return {
          country,
          x: projected[0],
          y: projected[1],
          visible: true,
        };
      }
      // For countries on the back hemisphere, place them cleanly along the outer orbital dock ring
      // so their testid buttons remain 100% DOM-accessible and clickable at any rotation angle!
      const angle =
        ((country.coordinates.lng + rotation[0]) * Math.PI) / 180;
      const rimRadius = Math.min(svgSize / 2 - 18, currentRadius + 20);
      return {
        country,
        x: svgSize / 2 + Math.sin(angle) * rimRadius,
        y: svgSize / 2 - Math.sin((country.coordinates.lat * Math.PI) / 180) * (rimRadius * 0.78),
        visible: false,
      };
    });
  }, [countries, projection, rotation, currentRadius]);

  // Currently hovered or selected country for the telemetry HUD card
  const activeCountry = useMemo(() => {
    if (hoveredCountryCode) {
      return countries.find((c) => c.code === hoveredCountryCode) || null;
    }
    if (selectedCountryCode) {
      return countries.find((c) => c.code === selectedCountryCode) || null;
    }
    return countries.find((c) => c.supported) || countries[0] || null;
  }, [hoveredCountryCode, selectedCountryCode, countries]);

  // Filtered countries for the keyboard-accessible Country Selector sidebar
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return countries.filter((country) => {
      if (filterMode === 'supported' && !country.supported) {
        return false;
      }
      if (!q) return true;
      return (
        country.name.toLowerCase().includes(q) ||
        country.code.toLowerCase().includes(q) ||
        country.isoA3.toLowerCase().includes(q) ||
        country.region.toLowerCase().includes(q) ||
        (country.legalTradition && country.legalTradition.toLowerCase().includes(q))
      );
    });
  }, [countries, searchQuery, filterMode]);

  const supportedCount = useMemo(
    () => countries.filter((c) => c.supported).length,
    [countries]
  );

  // Mouse pointer drag handlers for smooth 3D globe rotation
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) {
        return;
      }
      isDraggingRef.current = true;
      dragStartPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        rot: [rotation[0], rotation[1]],
      };
    },
    [rotation]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    const sensitivity = 0.35;
    const nextLng = dragStartPosRef.current.rot[0] + dx * sensitivity;
    const nextLat = Math.max(
      -75,
      Math.min(75, dragStartPosRef.current.rot[1] - dy * sensitivity)
    );
    setRotation([nextLng, nextLat]);
  }, []);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleResetView = useCallback(() => {
    setRotation([25, -22]);
    setZoomScale(1);
  }, []);

  const handleSelectCountryAction = useCallback(
    (country: CountryMetadata) => {
      setRotation([
        -country.coordinates.lng,
        Math.max(-65, Math.min(65, -country.coordinates.lat)),
      ]);
      onSelectCountry(country);
    },
    [onSelectCountry]
  );

  return (
    <section
      aria-label="Interactive Global Jurisdiction Explorer"
      className="relative rounded-2xl border border-slate-800/90 bg-slate-950/90 shadow-2xl overflow-hidden"
    >
      {/* Ambient Radial Space Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_50%,rgba(14,165,233,0.14),transparent_60%),radial-gradient(circle_at_70%_20%,rgba(16,185,129,0.10),transparent_55%)]"
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 lg:p-6">
        {/* Left/Center Column: 3D Interactive Globe Viewport (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 relative overflow-hidden">
          {/* Top Globe Telemetry Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 z-20 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                    3D Orthographic Jurisdiction Globe
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                    <Sparkles className="h-3 w-3" />
                    {supportedCount} Verified GAM Jurisdictions
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Drag to rotate sphere, click any glowing beacon or country polygon, or use the keyboard selector.
                </p>
              </div>
            </div>

            {/* Globe Camera & Rotation Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAutoRotating((prev) => !prev)}
                aria-label={isAutoRotating ? 'Pause Rotation' : 'Auto-Rotate'}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isAutoRotating
                    ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25'
                    : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {isAutoRotating ? (
                  <>
                    <Pause className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Pause Rotation</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 text-slate-400" />
                    <span>Auto-Rotate</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.min(1.45, Number((z + 0.12).toFixed(2))))}
                aria-label="Zoom in globe"
                title="Zoom In"
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setZoomScale((z) => Math.max(0.76, Number((z - 0.12).toFixed(2))))}
                aria-label="Zoom out globe"
                title="Zoom Out"
                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetView}
                aria-label="Reset View"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset View</span>
              </button>
            </div>
          </div>

          {/* Interactive 3D Globe Stage */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="relative mx-auto flex items-center justify-center select-none cursor-grab active:cursor-grabbing my-1"
            style={{ width: '100%', maxWidth: 520, aspectRatio: '1 / 1' }}
          >
            {/* Optional WebGL 3D Shaded Sphere Layer */}
            <canvas
              ref={webglCanvasRef}
              width={520}
              height={520}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-65"
            />

            {/* High-Precision Orthographic Spherical Vector & Polygon Layer */}
            <svg
              viewBox={`0 0 ${svgSize} ${svgSize}`}
              role="img"
              aria-label="3D Spherical World Map with Legal Jurisdictions"
              className="relative z-10 h-full w-full overflow-visible"
            >
              <defs>
                <radialGradient id="globe-ocean-grad" cx="38%" cy="32%" r="68%">
                  <stop offset="0%" stopColor="#0f2942" />
                  <stop offset="55%" stopColor="#08162b" />
                  <stop offset="100%" stopColor="#030914" />
                </radialGradient>
                <radialGradient id="globe-atmosphere-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="82%" stopColor="rgba(56, 189, 248, 0)" />
                  <stop offset="95%" stopColor="rgba(56, 189, 248, 0.22)" />
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
                </radialGradient>
              </defs>

              {/* Outer Atmospheric Halo */}
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={currentRadius + 18}
                fill="url(#globe-atmosphere-glow)"
                className="pointer-events-none"
              />

              {/* Ocean Sphere Base */}
              <circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={currentRadius}
                fill="url(#globe-ocean-grad)"
                stroke="rgba(56, 189, 248, 0.4)"
                strokeWidth={1.5}
              />

              {/* Graticule Lines (Latitude / Longitude Grid) */}
              {graticulePath && (
                <path
                  d={graticulePath}
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.14)"
                  strokeWidth={0.75}
                  className="pointer-events-none"
                />
              )}

              {/* Continents & Country Polygons from world-atlas TopoJSON */}
              <g>
                {renderedCountryPaths.map((item) => {
                  if (!item) return null;
                  const { key, d, matchedCountry } = item;
                  const isSelected =
                    matchedCountry && matchedCountry.code === selectedCountryCode;
                  const isHovered =
                    matchedCountry && matchedCountry.code === hoveredCountryCode;
                  const isSupported = matchedCountry?.supported ?? false;

                  let fill = 'rgba(30, 41, 59, 0.82)';
                  let stroke = 'rgba(100, 116, 139, 0.45)';
                  let strokeWidth = 0.7;

                  if (isSelected) {
                    fill = isSupported
                      ? 'rgba(16, 185, 129, 0.52)'
                      : 'rgba(56, 189, 248, 0.45)';
                    stroke = '#6ee7b7';
                    strokeWidth = 1.6;
                  } else if (isHovered) {
                    fill = isSupported
                      ? 'rgba(16, 185, 129, 0.38)'
                      : 'rgba(56, 189, 248, 0.32)';
                    stroke = '#38bdf8';
                    strokeWidth = 1.25;
                  } else if (isSupported) {
                    fill = 'rgba(6, 95, 70, 0.55)';
                    stroke = 'rgba(52, 211, 153, 0.6)';
                    strokeWidth = 0.95;
                  }

                  return (
                    <path
                      key={key}
                      d={d}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      className={
                        matchedCountry
                          ? 'cursor-pointer transition-colors duration-150'
                          : 'pointer-events-none'
                      }
                      onMouseEnter={() => {
                        if (matchedCountry) {
                          setHoveredCountryCode(matchedCountry.code);
                        }
                      }}
                      onMouseLeave={() => {
                        if (matchedCountry) {
                          setHoveredCountryCode((prev) =>
                            prev === matchedCountry.code ? null : prev
                          );
                        }
                      }}
                      onClick={(e) => {
                        if (matchedCountry) {
                          e.stopPropagation();
                          handleSelectCountryAction(matchedCountry);
                        }
                      }}
                    />
                  );
                })}
              </g>
            </svg>

            {/* Interactive Country Beacon Overlay (DOM buttons with required data-testid) */}
            <div className="pointer-events-none absolute inset-0 z-20">
              {projectedPins.map(({ country, x, y, visible }) => {
                const isSelected = country.code === selectedCountryCode;
                const isHovered = country.code === hoveredCountryCode;
                const leftPct = `${((x / svgSize) * 100).toFixed(2)}%`;
                const topPct = `${((y / svgSize) * 100).toFixed(2)}%`;

                return (
                  <button
                    key={country.code}
                    type="button"
                    data-testid={`globe-country-${country.code}`}
                    aria-label={`Select ${country.name} (${country.code})${
                      country.supported
                        ? ` — ${country.lawIds.length} verified GAM laws`
                        : ' — unsupported jurisdiction'
                    }`}
                    aria-pressed={isSelected}
                    onMouseEnter={() => setHoveredCountryCode(country.code)}
                    onMouseLeave={() =>
                      setHoveredCountryCode((prev) =>
                        prev === country.code ? null : prev
                      )
                    }
                    onFocus={() => setHoveredCountryCode(country.code)}
                    onBlur={() =>
                      setHoveredCountryCode((prev) =>
                        prev === country.code ? null : prev
                      )
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectCountryAction(country);
                    }}
                    style={{ left: leftPct, top: topPct }}
                    className={`pointer-events-auto group absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      visible ? 'opacity-100 scale-100' : 'opacity-55 scale-90'
                    }`}
                  >
                    {/* Beacon Pulse Ring for Supported Jurisdictions */}
                    {country.supported && visible && !effectiveReducedMotion && (
                      <span
                        aria-hidden="true"
                        className="absolute inline-flex h-6 w-6 -left-1 -top-1 animate-ping rounded-full bg-emerald-400/50"
                      />
                    )}

                    {/* Core Beacon Dot */}
                    <span
                      className={`relative flex items-center justify-center rounded-full border shadow-md transition-transform group-hover:scale-125 ${
                        isSelected
                          ? 'h-5 w-5 bg-emerald-400 border-white text-slate-950 ring-4 ring-emerald-500/30'
                          : country.supported
                          ? 'h-4 w-4 bg-emerald-500 border-emerald-200 text-slate-950'
                          : 'h-3 w-3 bg-slate-600 border-slate-300/70 text-slate-100'
                      }`}
                    />

                    {/* Compact Floating Code Badge on Globe */}
                    {(visible || isSelected || isHovered) && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-tight shadow backdrop-blur-sm transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : isHovered
                            ? 'bg-cyan-500 text-slate-950'
                            : country.supported
                            ? 'bg-slate-900/90 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-900/80 text-slate-300 border border-slate-700/80'
                        }`}
                      >
                        {country.flag} {country.code}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Active Country Telemetry HUD & Legend */}
          <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-950/85 p-3.5 z-20">
            {activeCountry ? (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-2xl">
                  {activeCountry.flag}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {activeCountry.name}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono text-slate-300">
                      {activeCountry.isoA3} · {activeCountry.code}
                    </span>
                    <span className="text-xs text-slate-400">
                      {activeCountry.region}
                    </span>
                    {activeCountry.legalTradition && (
                      <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[11px] text-indigo-300">
                        {activeCountry.legalTradition}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {activeCountry.supported ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        {activeCountry.lawIds.length} verified GAM statutory translation
                        {activeCountry.lawIds.length > 1 ? 's' : ''} available
                        {getCatalogueForCountry(activeCountry.code).length > 0 &&
                          ` + ${getCatalogueForCountry(activeCountry.code).length} catalogued`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-300">
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        No validated demonstration law bundled — custom statutory workbench available
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-400 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30" />
                Verified GAM Law
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                Unbundled Jurisdiction
              </span>
              <span className="hidden xl:inline-flex items-center gap-1 font-mono text-[11px] text-slate-500">
                <Compass className="h-3.5 w-3.5 text-cyan-400" />
                {Math.round(-rotation[1])}°N, {Math.round(-rotation[0])}°E
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Accessible Country Selector & Jurisdiction Directory (5 cols) */}
        <div
          aria-label="Accessible Country Selector"
          className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/50 p-4"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-100">
                  Jurisdiction Selector
                </h3>
                <p className="text-xs text-slate-400">
                  Full keyboard navigation — usable without 3D pointer interaction
                </p>
              </div>
              <span className="rounded-md bg-slate-800/90 border border-slate-700 px-2 py-1 text-xs font-mono text-slate-300">
                {filteredCountries.length} / {countries.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country, ISO code, region, or legal tradition..."
                aria-label="Search countries"
                className="w-full rounded-lg border border-slate-700/90 bg-slate-950/90 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            {/* Filter Mode Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3" role="group" aria-label="Filter jurisdictions">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                aria-pressed={filterMode === 'all'}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterMode === 'all'
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                All Jurisdictions ({countries.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('supported')}
                aria-pressed={filterMode === 'supported'}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterMode === 'supported'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                Verified GAM Laws ({supportedCount})
              </button>
            </div>

            {/* Scrollable Country List */}
            <div
              role="listbox"
              aria-label="Countries and Jurisdictions"
              className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1"
            >
              {filteredCountries.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
                  No jurisdictions match &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredCountries.map((country) => {
                  const isSelected = country.code === selectedCountryCode;
                  return (
                    <button
                      key={country.code}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-testid={`country-option-${country.code}`}
                      onClick={() => handleSelectCountryAction(country)}
                      onMouseEnter={() => setHoveredCountryCode(country.code)}
                      onMouseLeave={() =>
                        setHoveredCountryCode((prev) =>
                          prev === country.code ? null : prev
                        )
                      }
                      className={`w-full text-left rounded-xl border p-2.5 transition-all flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                        isSelected
                          ? 'border-emerald-500/60 bg-emerald-500/15 shadow-sm'
                          : 'border-slate-800/90 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0" aria-hidden="true">
                          {country.flag}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-100 truncate">
                              {country.name}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                              {country.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                            <span>{country.region}</span>
                            {country.legalTradition && (
                              <>
                                <span>·</span>
                                <span className="truncate">{country.legalTradition}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end">
                        {country.supported ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            {country.lawIds.length}{' '}
                            {country.lawIds.length === 1 ? 'Law' : 'Laws'}
                            {getCatalogueForCountry(country.code).length > 0 &&
                              ` + ${getCatalogueForCountry(country.code).length} catalogued`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
                            <MapPin className="h-3 w-3 text-slate-500" />
                            Unbundled
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Epistemic Honesty Note in Selector Footer */}
          <div className="mt-3 rounded-lg border border-slate-800/90 bg-slate-950/70 p-2.5 text-[11px] text-slate-400 leading-relaxed">
            <strong className="text-slate-200 font-medium">Methodological Note:</strong>{' '}
            Jurisdictions marked <span className="text-emerald-300">Verified GAM Laws</span> include human-reviewed statutory provisions mapped to formal GAL specifications ($\Phi_L$). Selecting an unbundled jurisdiction opens an explicit non-fabricated fallback notice with custom legislative workbench options.
          </div>
        </div>
      </div>
    </section>
  );
};
