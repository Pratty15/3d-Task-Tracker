import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js'
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js'

// Setup scene, camera, renderer
const canvas = document.getElementById('bg-canvas')
if (!canvas) {
  console.error("Canvas element not found!")
}

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x090d16, 0.04)

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 5, 12)

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  alpha: true,
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxDistance = 25
controls.minDistance = 3
controls.maxPolarAngle = Math.PI / 2 + 0.1

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
scene.add(ambientLight)

const dirLight = new THREE.DirectionalLight(0xffffff, 0.6)
dirLight.position.set(5, 10, 7)
scene.add(dirLight)

// Background Stars (Static particle system)
const starsGeometry = new THREE.BufferGeometry()
const starsCount = 1200
const starPositions = new Float32Array(starsCount * 3)
for (let i = 0; i < starsCount * 3; i++) {
  starPositions[i] = (Math.random() - 0.5) * 35
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
const starsMaterial = new THREE.PointsMaterial({
  size: 0.025,
  color: 0x3b82f6,
  transparent: true,
  opacity: 0.5
})
const starsMesh = new THREE.Points(starsGeometry, starsMaterial)
scene.add(starsMesh)

// Cluster Centers Mapping
const CLUSTER_CENTERS = {
  Dev: new THREE.Vector3(-5, 2, -2),
  Design: new THREE.Vector3(5, 3, 1),
  Research: new THREE.Vector3(0, -2, -3),
  Testing: new THREE.Vector3(-4, -3, 3),
  Ops: new THREE.Vector3(5, -2, -2)
}

const CATEGORY_COLORS = {
  Dev: 0x3b82f6,      // Blue
  Design: 0xec4899,    // Pink
  Research: 0xf59e0b,  // Orange/Yellow
  Testing: 0x10b981,   // Green/Emerald
  Ops: 0xa855f7        // Purple
}

const CATEGORY_LABELS = {
  Dev: '💻 Developer Cluster',
  Design: '🎨 Design Cluster',
  Research: '🔍 Research Cluster',
  Testing: '🧪 Testing Cluster',
  Ops: '🚀 Operations Cluster'
}

// Visual State Colors
const TASK_COLORS = {
  normal: 0x3b82f6,
  warning: 0xf59e0b,
  overdue: 0xef4444,
  completed: 0x10b981
}

// Constellation Group
const constellationGroup = new THREE.Group()
scene.add(constellationGroup)

// Node lists
let taskNodes = []       // { mesh, task }
let hubMeshes = []       // { mesh, category }
let connectionLines = [] // line meshes
let interHubLines = null // line connecting the hubs

// Deterministic spherical offsets inside a cluster
function getTaskOffset(id) {
  let h1 = 0, h2 = 0, h3 = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    h1 = (h1 * 31 + char) % 1000
    h2 = (h2 * 37 + char) % 1000
    h3 = (h3 * 41 + char) % 1000
  }
  const theta = (h1 / 1000) * Math.PI * 2
  const phi = Math.acos(((h2 / 1000) * 2) - 1)
  const r = 0.8 + (h3 / 1000) * 1.6
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  )
}

// Tooltip setup
let tooltip = document.getElementById('three-tooltip')
if (!tooltip) {
  tooltip = document.createElement('div')
  tooltip.id = 'three-tooltip'
  tooltip.style.position = 'absolute'
  tooltip.style.background = 'rgba(8, 12, 22, 0.95)'
  tooltip.style.border = '1px solid rgba(255, 255, 255, 0.15)'
  tooltip.style.borderRadius = '8px'
  tooltip.style.padding = '10px 14px'
  tooltip.style.color = '#fff'
  tooltip.style.fontFamily = "'Plus Jakarta Sans', sans-serif"
  tooltip.style.fontSize = '12px'
  tooltip.style.pointerEvents = 'none'
  tooltip.style.display = 'none'
  tooltip.style.zIndex = '9999'
  tooltip.style.boxShadow = '0 10px 20px rgba(0,0,0,0.5)'
  tooltip.style.backdropFilter = 'blur(5px)'
  document.body.appendChild(tooltip)
}

// Smooth Camera Transition State
let cameraTargetPos = null
let controlsTargetPos = null
let isAnimatingCamera = false
const cameraTransitionSpeed = 0.05

function flyTo(targetVector) {
  cameraTargetPos = targetVector.clone().add(new THREE.Vector3(0, 2, 4.5))
  controlsTargetPos = targetVector.clone()
  isAnimatingCamera = true
}

// Theme applier for 3D elements
function applyTheme(theme) {
  const isDark = theme === 'dark'
  
  // Interpolate fog color to blend with CSS gradient background
  const targetFogColor = isDark ? 0x090d16 : 0xf8fafc
  scene.fog.color.setHex(targetFogColor)
  
  // Stars visual adjustment
  starsMesh.material.color.setHex(isDark ? 0x3b82f6 : 0x475569)
  starsMesh.material.opacity = isDark ? 0.5 : 0.2
  
  // Light intensity adjustments
  ambientLight.intensity = isDark ? 0.3 : 0.8
  dirLight.intensity = isDark ? 0.6 : 0.35
}

// Re-generate layout based on task list
async function updateConstellation() {
  try {
    // Read workspace context if defined globally
    const workspaceId = window.activeWorkspaceId || ''
    const memberId = window.activeMemberId || ''
    const res = await fetch(`/api/tasks?workspaceId=${workspaceId}&memberId=${memberId}`)
    if (!res.ok) return
    const tasks = await res.json()

    // 1. Clear old elements
    taskNodes.forEach(node => {
      constellationGroup.remove(node.mesh)
      node.mesh.geometry.dispose()
      node.mesh.material.dispose()
    })
    taskNodes = []

    hubMeshes.forEach(hub => {
      constellationGroup.remove(hub.mesh)
      hub.mesh.geometry.dispose()
      hub.mesh.material.dispose()
    })
    hubMeshes = []

    connectionLines.forEach(line => {
      constellationGroup.remove(line)
      line.geometry.dispose()
      line.material.dispose()
    })
    connectionLines = []

    if (interHubLines) {
      constellationGroup.remove(interHubLines)
      interHubLines.geometry.dispose()
      interHubLines.material.dispose()
      interHubLines = null
    }

    if (!tasks || tasks.length === 0) return

    // Find active categories
    const activeCategories = new Set(tasks.map(t => t.category || 'Dev'))

    // 2. Render Category Hubs
    activeCategories.forEach(cat => {
      const center = CLUSTER_CENTERS[cat] || CLUSTER_CENTERS.Dev
      const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Dev

      const geometry = new THREE.OctahedronGeometry(0.75, 0)
      const material = new THREE.MeshPhysicalMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 1.2,
        wireframe: true,
        transparent: true,
        opacity: 0.85
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(center)
      mesh.userData = { isHub: true, category: cat, name: CATEGORY_LABELS[cat] }

      // Outer Orbital Ring
      const ringGeo = new THREE.TorusGeometry(1.2, 0.02, 16, 64)
      const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.45, wireframe: true })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.rotation.x = Math.PI / 3
      mesh.add(ringMesh)

      // Inner Core Glow Light
      const pointLight = new THREE.PointLight(color, 2, 8)
      mesh.add(pointLight)

      constellationGroup.add(mesh)
      hubMeshes.push({ mesh, category: cat })
    })

    // 3. Pre-calculate positions
    const nodePositions = {}
    
    // First pass: Position parent tasks (tasks without parent)
    tasks.forEach(task => {
      if (task.parent) return; // skip subtasks in first pass
      const cat = task.category || 'Dev'
      const center = CLUSTER_CENTERS[cat] || CLUSTER_CENTERS.Dev
      const offset = getTaskOffset(task.id)
      const pos = center.clone().add(offset)
      nodePositions[task.id] = pos
    })
    
    // Second pass: Position subtasks (orbiting their parent tasks)
    tasks.forEach(task => {
      if (!task.parent) return;
      const parentPos = nodePositions[task.parent]
      if (parentPos) {
        // Place subtask in a tight orbit around parent node
        const offset = getTaskOffset(task.id).multiplyScalar(0.4) // 40% distance, tighter orbit
        const pos = parentPos.clone().add(offset)
        nodePositions[task.id] = pos
      } else {
        // Fallback: regular position from cluster center
        const cat = task.category || 'Dev'
        const center = CLUSTER_CENTERS[cat] || CLUSTER_CENTERS.Dev
        const offset = getTaskOffset(task.id)
        nodePositions[task.id] = center.clone().add(offset)
      }
    })

    // Now, render tasks
    tasks.forEach(task => {
      const cat = task.category || 'Dev'
      const center = CLUSTER_CENTERS[cat] || CLUSTER_CENTERS.Dev
      const pos = nodePositions[task.id] || center.clone()

      // Task node colors
      let color = TASK_COLORS.normal
      if (task.completed) {
        color = TASK_COLORS.completed
      } else if (task.endDate) {
        const now = new Date()
        const deadline = new Date(task.endDate)
        const diff = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        if (diff < 0) color = TASK_COLORS.overdue
        else if (diff <= 2) color = TASK_COLORS.warning
      }

      // Node size based on priority
      let size = task.parent ? 0.16 : 0.3 // Subtask nodes are slightly smaller by default
      if (task.priority === 'High') size = task.parent ? 0.22 : 0.44
      if (task.priority === 'Low') size = task.parent ? 0.10 : 0.18

      const geometry = new THREE.SphereGeometry(size, 24, 24)
      const material = new THREE.MeshPhysicalMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: task.completed ? 0.35 : 1.3,
        roughness: 0.1,
        transparent: true,
        opacity: task.completed ? 0.4 : 0.9
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(pos)
      mesh.userData = { 
        taskId: task.id, 
        title: task.title, 
        completed: task.completed, 
        priority: task.priority, 
        category: cat,
        assignedEmail: task.expand?.assignedTo?.email || null,
        parent: task.parent || null
      }

      constellationGroup.add(mesh)
      taskNodes.push({ mesh, task })

      // Determine where the connecting line starts
      let startPoint = center
      if (task.parent && nodePositions[task.parent]) {
        startPoint = nodePositions[task.parent]
      }

      // Draw connecting lines (from Hub/Parent to Task Node)
      const linePositions = [startPoint.x, startPoint.y, startPoint.z, pos.x, pos.y, pos.z]
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
      
      const lineMat = new THREE.LineBasicMaterial({
        color: task.parent ? 0x8b5cf6 : (CATEGORY_COLORS[cat] || 0xffffff), // Subtask connecting lines are purple
        transparent: true,
        opacity: task.completed ? 0.08 : (task.parent ? 0.5 : 0.3), // Subtask connections are slightly more visible
        linewidth: 1
      })

      const line = new THREE.Line(lineGeo, lineMat)
      constellationGroup.add(line)
      connectionLines.push(line)
    })

    // 4. Connect Hubs together
    const hubPositions = []
    hubMeshes.forEach(hub => {
      hubPositions.push(hub.mesh.position.x, hub.mesh.position.y, hub.mesh.position.z)
    })

    if (hubPositions.length > 3) {
      const interHubGeo = new THREE.BufferGeometry()
      const segmentCoords = []
      for (let i = 0; i < hubMeshes.length; i++) {
        const p1 = hubMeshes[i].mesh.position
        const p2 = hubMeshes[(i + 1) % hubMeshes.length].mesh.position
        segmentCoords.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z)
      }
      interHubGeo.setAttribute('position', new THREE.Float32BufferAttribute(segmentCoords, 3))
      const interHubMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        linewidth: 1
      })
      interHubLines = new THREE.LineSegments(interHubGeo, interHubMat)
      constellationGroup.add(interHubLines)
    }

  } catch (err) {
    console.error("Error drawing cluster networks:", err)
  }
}

// Raycasting for Interactivity
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let hoveredNode = null

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

  if (hoveredNode) {
    tooltip.style.left = (e.clientX + 15) + 'px'
    tooltip.style.top = (e.clientY + 15) + 'px'
  }
})

// Highlight list item when clicked in 3D
window.addEventListener('click', () => {
  if (hoveredNode) {
    const data = hoveredNode.object.userData
    if (data.isHub) {
      flyTo(hoveredNode.object.position)
    } else {
      flyTo(hoveredNode.object.position)

      const listElement = document.getElementById(`task-${data.taskId}`)
      if (listElement) {
        listElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        listElement.style.borderColor = '#3b82f6'
        listElement.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.4)'
        setTimeout(() => {
          listElement.style.borderColor = ''
          listElement.style.boxShadow = ''
        }, 1500)
      }
    }
  }
})

// Focus node listener from HTML list
window.addEventListener('focus-node', (e) => {
  const taskId = e.detail
  const node = taskNodes.find(n => n.task.id === taskId)
  if (node) {
    flyTo(node.mesh.position)
    
    node.mesh.material.emissiveIntensity = 3.0
    setTimeout(() => {
      node.mesh.material.emissiveIntensity = node.task.completed ? 0.35 : 1.3
    }, 2000)
  }
})

// Theme toggle event listener
window.addEventListener('theme-changed', (e) => {
  applyTheme(e.detail)
})

// Animation loop
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const elapsedTime = clock.getElapsedTime()

  if (!isAnimatingCamera) {
    constellationGroup.rotation.y = elapsedTime * 0.02
    starsMesh.rotation.y = elapsedTime * 0.008
  }

  // Animate Hub nodes rotation
  hubMeshes.forEach(hub => {
    hub.mesh.rotation.y = elapsedTime * 0.8
    hub.mesh.rotation.x = elapsedTime * 0.4
    hub.mesh.material.emissiveIntensity = 0.8 + Math.sin(elapsedTime * 3) * 0.3
  })

  // Pulsate glowing alert nodes (overdue/urgent tasks)
  taskNodes.forEach(node => {
    const mesh = node.mesh
    const task = node.task
    
    if (!task.completed) {
      const urgencyColor = mesh.material.color.getHex()
      if (urgencyColor === TASK_COLORS.overdue) {
        const scaleVal = 1 + Math.sin(elapsedTime * 8) * 0.12
        mesh.scale.set(scaleVal, scaleVal, scaleVal)
        mesh.material.emissiveIntensity = 1.2 + Math.sin(elapsedTime * 8) * 0.5
      } else if (urgencyColor === TASK_COLORS.warning) {
        const scaleVal = 1 + Math.sin(elapsedTime * 4) * 0.08
        mesh.scale.set(scaleVal, scaleVal, scaleVal)
        mesh.material.emissiveIntensity = 1.0 + Math.sin(elapsedTime * 4) * 0.3
      } else {
        mesh.position.y += Math.sin(elapsedTime * 2 + mesh.position.x) * 0.0006
      }
    }
  })

  // Smooth camera interpolation
  if (isAnimatingCamera && cameraTargetPos && controlsTargetPos) {
    camera.position.lerp(cameraTargetPos, cameraTransitionSpeed)
    controls.target.lerp(controlsTargetPos, cameraTransitionSpeed)
    
    if (camera.position.distanceTo(cameraTargetPos) < 0.05 && controls.target.distanceTo(controlsTargetPos) < 0.05) {
      isAnimatingCamera = false
    }
  }

  controls.update()

  // Raycaster checks
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(constellationGroup.children, true)
  const hitMeshes = intersects.filter(hit => hit.object.type === 'Mesh')

  if (hitMeshes.length > 0) {
    const currentHit = hitMeshes[0]
    if (hoveredNode !== currentHit) {
      if (hoveredNode) {
        const oldData = hoveredNode.object.userData
        if (oldData.isHub) {
          hoveredNode.object.material.emissiveIntensity = 0.9
        } else {
          hoveredNode.object.material.emissiveIntensity = oldData.completed ? 0.35 : 1.3
        }
      }

      hoveredNode = currentHit
      hoveredNode.object.material.emissiveIntensity = 2.5
      document.body.style.cursor = 'pointer'

      const data = hoveredNode.object.userData
      if (data.isHub) {
        tooltip.innerHTML = `
          <div style="font-weight:700;font-family:'Space Grotesk'">${data.name}</div>
          <div style="color:#94a3b8;font-size:10px">Category Center</div>
        `
      } else {
        const priorityText = `<span style="color:${data.priority === 'High' ? '#fca5a5' : '#fcd34d'}">${data.priority || 'Medium'} Priority</span>`
        const stateText = data.completed ? '<span style="color:#34d399">Completed</span>' : '<span style="color:#60a5fa">Active</span>'
        const categoryLabels = { Dev: 'Dev', Design: 'Design', Research: 'Research', Testing: 'Testing', Ops: 'Ops' }
        const catText = categoryLabels[data.category] || data.category
        
        let assignmentLine = ""
        if (data.assignedEmail) {
          assignmentLine = `<div style="font-size:10px;color:#34d399;margin-top:2px"><i class="fa-regular fa-user"></i> Assigned: ${data.assignedEmail}</div>`
        }

        const parentLine = data.parent ? `<div style="font-size:10px;color:#a78bfa;margin-top:2px"><i class="fa-solid fa-code-branch"></i> Subtask Node</div>` : ''

        tooltip.innerHTML = `
          <div style="font-weight:700;margin-bottom:4px;font-family:'Space Grotesk'">${data.title}</div>
          <div>Status: ${stateText} | ${priorityText}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px">Cluster: ${catText}</div>
          ${assignmentLine}
          ${parentLine}
        `
      }
      tooltip.style.display = 'block'
    }
  } else {
    if (hoveredNode) {
      const oldData = hoveredNode.object.userData
      if (oldData.isHub) {
        hoveredNode.object.material.emissiveIntensity = 0.9
      } else {
        hoveredNode.object.material.emissiveIntensity = oldData.completed ? 0.35 : 1.3
      }
      hoveredNode = null
      document.body.style.cursor = 'default'
      tooltip.style.display = 'none'
    }
  }

  renderer.render(scene, camera)
}

// Window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// HTMX refresh sync
document.body.addEventListener('htmx:afterOnLoad', () => {
  setTimeout(updateConstellation, 100)
})

// Initialize theme immediately
const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark'
applyTheme(initialTheme)

// Start
updateConstellation()
animate()

// Sync backup polling
setInterval(updateConstellation, 3500)
