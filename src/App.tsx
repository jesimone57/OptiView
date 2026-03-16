/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Monitor, Ruler, Eye, Maximize2, Settings2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Constants
const MIN_DIAGONAL = 42;
const MAX_DIAGONAL = 120;
const MIN_DISTANCE = 5;
const MAX_DISTANCE = 25;
const DISTANCE_STEP = 0.5;

type AspectRatio = '16:9' | '4:3';

export default function App() {
  const [diagonal, setDiagonal] = useState(65);
  const [distanceFt, setDistanceFt] = useState(10);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [showInfo, setShowInfo] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    screenMesh: THREE.Mesh;
    viewerMesh: THREE.Group;
    coneMesh: THREE.Mesh;
    grid: THREE.GridHelper;
  } | null>(null);

  // Calculations
  const { width, height, viewingAngle } = useMemo(() => {
    const ar = aspectRatio === '16:9' ? 16 / 9 : 4 / 3;
    const h = diagonal / Math.sqrt(ar * ar + 1);
    const w = h * ar;
    
    const distanceInches = distanceFt * 12;
    const angleRad = 2 * Math.atan(w / (2 * distanceInches));
    const angleDeg = angleRad * (180 / Math.PI);

    return {
      width: w,
      height: h,
      viewingAngle: angleDeg,
    };
  }, [diagonal, aspectRatio, distanceFt]);

  // Initialize Three.js
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9); // Light slate background

    const camera = new THREE.PerspectiveCamera(45, canvasRef.current.clientWidth / canvasRef.current.clientHeight, 0.1, 1000);
    camera.position.set(15, 10, 20);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Grid
    const grid = new THREE.GridHelper(50, 50, 0xcbd5e1, 0xe2e8f0); // Light grid colors
    scene.add(grid);

    // Screen
    const screenGeometry = new THREE.PlaneGeometry(1, 1);
    const screenMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x1e293b, // Dark slate for the screen
      side: THREE.DoubleSide,
      emissive: 0x0f172a,
      shininess: 100
    });
    const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
    // Add a border
    const borderGeom = new THREE.EdgesGeometry(screenGeometry);
    const borderMat = new THREE.LineBasicMaterial({ color: 0x64748b });
    const border = new THREE.LineSegments(borderGeom, borderMat);
    screenMesh.add(border);
    scene.add(screenMesh);

    // Viewer (Head representation)
    const viewerGroup = new THREE.Group();
    const headGeom = new THREE.SphereGeometry(0.3, 32, 32);
    const headMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
    const head = new THREE.Mesh(headGeom, headMat);
    viewerGroup.add(head);
    
    // Simple eyes
    const eyeGeom = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.1, 0.05, 0.25);
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.1, 0.05, 0.25);
    viewerGroup.add(leftEye, rightEye);
    
    scene.add(viewerGroup);

    // Viewing Cone (Visualizing the angle)
    const coneGeom = new THREE.BufferGeometry();
    const coneMat = new THREE.MeshBasicMaterial({ 
      color: 0x3b82f6, 
      transparent: true, 
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const coneMesh = new THREE.Mesh(coneGeom, coneMat);
    scene.add(coneMesh);

    sceneRef.current = { scene, camera, renderer, controls, screenMesh, viewerMesh: viewerGroup, coneMesh, grid };

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!canvasRef.current || !sceneRef.current) return;
      const { clientWidth, clientHeight } = canvasRef.current.parentElement!;
      sceneRef.current.camera.aspect = clientWidth / clientHeight;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(clientWidth, clientHeight);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update scene based on state
  useEffect(() => {
    if (!sceneRef.current) return;
    const { screenMesh, viewerMesh, coneMesh } = sceneRef.current;

    // Scale factors (1 unit = 1 foot in 3D space)
    const wFt = width / 12;
    const hFt = height / 12;
    const dFt = distanceFt;

    // Update Screen
    screenMesh.scale.set(wFt, hFt, 1);
    screenMesh.position.set(0, hFt / 2 + 2, 0); // Elevated slightly

    // Update Viewer
    viewerMesh.position.set(0, hFt / 2 + 2, dFt);
    viewerMesh.lookAt(0, hFt / 2 + 2, 0);

    // Update Viewing Cone
    const vertices = new Float32Array([
      0, 0, 0, // Origin (Viewer)
      -wFt / 2, hFt / 2, -dFt, // Top Left
      wFt / 2, hFt / 2, -dFt, // Top Right
      
      0, 0, 0,
      wFt / 2, hFt / 2, -dFt,
      wFt / 2, -hFt / 2, -dFt,

      0, 0, 0,
      wFt / 2, -hFt / 2, -dFt,
      -wFt / 2, -hFt / 2, -dFt,

      0, 0, 0,
      -wFt / 2, -hFt / 2, -dFt,
      -wFt / 2, hFt / 2, -dFt,
    ]);
    coneMesh.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    coneMesh.position.set(0, hFt / 2 + 2, dFt);

  }, [width, height, distanceFt]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 p-6 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Monitor className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">OptiView</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-blue-600 font-semibold">Cinema Geometry Engine</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Info className="w-5 h-5 text-slate-400" />
        </button>
      </header>

      {/* Main Content */}
      <main className="relative h-screen flex flex-col lg:flex-row overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-grow relative bg-slate-100">
          <canvas ref={canvasRef} className="w-full h-full cursor-move" />
          
          {/* Overlay Stats */}
          <div className="absolute bottom-8 left-8 flex flex-col gap-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-slate-200 p-6 rounded-2xl shadow-xl shadow-slate-200/50"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-light tracking-tighter text-blue-600">
                  {viewingAngle.toFixed(1)}°
                </span>
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Viewing Angle</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Width</p>
                  <p className="text-lg font-semibold text-slate-700">{width.toFixed(1)}"</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Height</p>
                  <p className="text-lg font-semibold text-slate-700">{height.toFixed(1)}"</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Controls Sidebar */}
        <aside className="w-full lg:w-[400px] bg-white border-l border-slate-200 p-8 flex flex-col gap-10 overflow-y-auto z-20">
          <div className="space-y-8">
            <div className="flex items-center gap-2 text-blue-600">
              <Settings2 className="w-4 h-4" />
              <h2 className="text-xs uppercase tracking-[0.2em] font-bold">Configuration</h2>
            </div>

            {/* Diagonal Slider */}
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                  <label className="text-sm font-medium text-slate-600">Diagonal Size</label>
                </div>
                <span className="text-2xl font-mono font-bold text-blue-600">{diagonal}"</span>
              </div>
              <input
                type="range"
                min={MIN_DIAGONAL}
                max={MAX_DIAGONAL}
                value={diagonal}
                onChange={(e) => setDiagonal(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span>{MIN_DIAGONAL}"</span>
                <span>{MAX_DIAGONAL}"</span>
              </div>
            </div>

            {/* Distance Slider */}
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-slate-400" />
                  <label className="text-sm font-medium text-slate-600">Viewing Distance</label>
                </div>
                <span className="text-2xl font-mono font-bold text-blue-600">{distanceFt.toFixed(1)} ft</span>
              </div>
              <input
                type="range"
                min={MIN_DISTANCE}
                max={MAX_DISTANCE}
                step={DISTANCE_STEP}
                value={distanceFt}
                onChange={(e) => setDistanceFt(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <span>{MIN_DISTANCE} ft</span>
                <span>{MAX_DISTANCE} ft</span>
              </div>
            </div>

            {/* Aspect Ratio Toggle */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-slate-400" />
                <label className="text-sm font-medium text-slate-600">Aspect Ratio</label>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                {(['16:9', '4:3'] as AspectRatio[]).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-3 rounded-lg text-xs font-bold transition-all ${
                      aspectRatio === ratio 
                        ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Guidelines Section */}
          <div className="mt-auto pt-10 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 mb-6">
              <Eye className="w-4 h-4" />
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold">THX Standards</h3>
            </div>
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border transition-colors ${viewingAngle >= 36 && viewingAngle <= 40 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-transparent'}`}>
                <p className={`text-xs font-bold mb-1 ${viewingAngle >= 36 && viewingAngle <= 40 ? 'text-blue-700' : 'text-slate-700'}`}>Recommended (36° - 40°)</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">THX recommends a 40 degree viewing angle for the most immersive cinematic experience.</p>
              </div>
              <div className={`p-4 rounded-xl border transition-colors ${viewingAngle < 30 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-transparent'}`}>
                <p className={`text-xs font-bold mb-1 ${viewingAngle < 30 ? 'text-orange-700' : 'text-slate-700'}`}>Too Far (&lt; 30°)</p>
                <p className="text-[10px] text-slate-500 leading-relaxed">The screen may feel small and details harder to perceive at this distance.</p>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setShowInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4 text-slate-900">About the Geometry</h2>
              <div className="space-y-4 text-slate-500 text-sm leading-relaxed">
                <p>
                  The horizontal viewing angle is calculated using the formula:
                  <code className="block bg-slate-50 p-2 rounded mt-2 text-blue-600 font-mono border border-slate-100">
                    θ = 2 * arctan(w / (2 * D))
                  </code>
                  Where <span className="text-slate-900 font-medium">w</span> is the screen width and <span className="text-slate-900 font-medium">D</span> is the viewing distance.
                </p>
                <p>
                  For a <span className="text-slate-900 font-medium">16:9</span> aspect ratio, the width is approximately <span className="text-slate-900 font-medium">87.16%</span> of the diagonal measurement.
                </p>
                <p>
                  Industry standards like <span className="text-blue-600 font-medium">THX</span> and <span className="text-blue-600 font-medium">SMPTE</span> suggest specific angles for optimal immersion, typically between 30° and 40°.
                </p>
              </div>
              <button 
                onClick={() => setShowInfo(false)}
                className="mt-8 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-500/30"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
