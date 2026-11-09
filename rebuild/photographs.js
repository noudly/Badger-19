/** Capture the story's real scene as a portable instant photograph. */
export function createPhotographs(THREE, renderer, scene, viewCamera) {
  const labels = {window: '窗边的一束光', together: '我们的小世界'};
  const captions = {window: 'a little light, kept.', together: 'a little world, just for you.'};
  const windowLook = new THREE.Vector3(2.82, 1.54, -1.78);

  function capture(kind, cast) {
    if (kind !== 'window' && kind !== 'together') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1400; canvas.height = 1600;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.fillStyle = '#f3eddf';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const camera = new THREE.PerspectiveCamera(kind === 'window' ? 74 : 38, 1, .06, 90);
      if (kind === 'window') {
        // Start at the front of the handheld lens. This is the bear's image,
        // rather than a second copy of the audience's moving stage camera.
        const handheld = cast?.bear?.camera;
        if (handheld) {
          handheld.updateWorldMatrix(true, false);
          camera.position.copy(handheld.localToWorld(new THREE.Vector3(.012, -.009, .155)));
        } else camera.position.set(1.5, 1.35, -.55);
        const head = cast?.badger?.head;
        if (head) {
          head.updateWorldMatrix(true, true);
          const faceCenter = head.getWorldPosition(new THREE.Vector3());
          const composition = faceCenter.multiplyScalar(.7).addScaledVector(new THREE.Vector3(2.98, 1.90, -2.29), .3);
          camera.lookAt(composition);
          camera.updateMatrixWorld(true);
          // Frame the face and flowers, while allowing the accidental close-up
          // to crop the feet and waving paw naturally.
          let tangent = 0;
          const include = point => {
            point.applyMatrix4(camera.matrixWorldInverse);
            if (point.z < -.06) tangent = Math.max(tangent, Math.abs(point.x / point.z), Math.abs(point.y / point.z));
          };
          head.traverse(object => {
            const positions = object.isMesh && object.visible && object.geometry?.attributes.position;
            if (!positions) return;
            for (let i = 0; i < positions.count; i++) include(new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld));
          });
          for (const x of [2.73, 3.23]) for (const y of [1.65, 2.12]) include(new THREE.Vector3(x, y, -2.29));
          camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(tangent / .91)), 68, 86);
          camera.updateProjectionMatrix();
        } else camera.lookAt(windowLook);
      } else {
        camera.position.set(0, 2.05, 5.2);
        camera.lookAt(0, 1.05, 0);
      }
      camera.updateMatrixWorld(true);

      const originalSize = new THREE.Vector2();
      renderer.getSize(originalSize);
      const originalRatio = renderer.getPixelRatio();
      const photographer = kind === 'window' ? cast?.bear?.group : null;
      const originalVisibility = photographer?.visible;
      try {
        if (photographer) photographer.visible = false;
        renderer.setPixelRatio(1);
        renderer.setSize(1000, 1000, false);
        renderer.render(scene, camera);
        context.drawImage(renderer.domElement, 75, 75, 1250, 1250);
      } finally {
        if (photographer) photographer.visible = originalVisibility;
        renderer.setPixelRatio(originalRatio);
        renderer.setSize(originalSize.x, originalSize.y, false);
        renderer.render(scene, viewCamera);
      }
      context.fillStyle = '#5b5246';
      context.textAlign = 'center';
      context.font = 'italic 39px Georgia';
      context.fillText(captions[kind], 700, 1430);
      context.font = '17px sans-serif';
      context.fillText(kind === 'window' ? 'THE LITTLE THINGS   /   19' : 'BADGER & BEAR   /   19', 700, 1500);
      const url = canvas.toDataURL('image/png');
      if (!url.startsWith('data:image/png')) return null;
      return {url, kind, label: labels[kind]};
    } catch {
      // The caller owns bounded retries and the user-visible save recovery.
      return null;
    }
  }
  return {capture};
}
