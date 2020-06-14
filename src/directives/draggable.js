export function draggable(node) {
  let x;
	let y;

	function onStartHandler({clientX, clientY}) {
		x = clientX;
		y = clientY;

		node.dispatchEvent(new CustomEvent('dragstart', {
			detail: { x: 0, y: 0 }
		}));
	}
  function handleMousedown(event) {
		onStartHandler({clientX: event.clientX, clientY: event.clientY})
	
		window.addEventListener('mousemove', handleMousemove);
		window.addEventListener('mouseup', handleMouseup);
	}
	function handleTouchdown(event) {
		onStartHandler({clientX: event.touches[0].clientX, clientY: event.touches[0].clientY})

		window.addEventListener('touchmove', handleTouchmove);
		window.addEventListener('touchend', handleTouchend);
	}

	function onMoveHandler({clientX, clientY}) {
		const offsetX = clientX - x
		const offsetY = y - clientY

		node.dispatchEvent(new CustomEvent('drag', {
			detail: { x: offsetX, y: offsetY }
		}));
	}
  function handleMousemove(event) {
		onMoveHandler({clientX: event.clientX, clientY: event.clientY})
	}
	function handleTouchmove(event) {
		onMoveHandler({clientX: event.touches[0].clientX, clientY: event.touches[0].clientY})
	}
	
	function onEndHandler({clientX, clientY}) {
		const offsetX = clientX - x
		const offsetY = y - clientY
		
		node.dispatchEvent(new CustomEvent('drag', {
			detail: { x: offsetX, y: offsetY }
		}));
	}
  function handleMouseup(event) {
		onEndHandler({clientX: event.clientX, clientY: event.clientY})
		
		window.removeEventListener('mousemove', handleMousemove);
		window.removeEventListener('mouseup', handleMouseup);
	}
	function handleTouchend(event) {
		onEndHandler({clientX: event.touches[0].clientX, clientY: event.touches[0].clientY})
		
		window.removeEventListener('touchmove', handleTouchmove);
		window.removeEventListener('touchend', handleTouchend);
	}
  
  node.addEventListener('mousedown', handleMousedown);
  node.addEventListener('touchstart', handleTouchdown);

  return {
		destroy() {
			node.removeEventListener('mousedown', handleMousedown);
			node.removeEventListener('touchstart', handleTouchdown);
		}
	};
}
