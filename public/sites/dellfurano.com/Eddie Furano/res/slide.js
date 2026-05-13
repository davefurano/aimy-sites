/* Slide page Javascript */
document.addEventListener('DOMContentLoaded', function(e) {
		'use strict';
		const 	INDUR = 500,										// Fade in duration
				OUTDUR = 1000,										// Fade out duration
				MOVETO = 3000,										// Timeout after mouse move
				LOADTO = 5000,										// Timeout after page load
				FRQ = 20;											// Step length
		
		let slideimg = document.getElementById('slideimage'),		// Main image
			elems = document.getElementsByClassName('autohide'),	// Elements to hide
			fto = null,												// Time out for fade later
			
			// Gets opacity
			getOpacity = function(el) {
					return parseFloat(window.getComputedStyle(el).getPropertyValue('opacity'));
				},
			
			// Fades in element in .5s
			fadeIn = function(el, opacity) {
				
					if (el.hasOwnProperty('fadeto')) {
						clearTimeout(el.fadeto);
					}
					
					let op = (typeof opacity !== 'undefined')? opacity : getOpacity(el);
					
					if (op < 1) {
						op = Math.min(1, op + FRQ / INDUR);
						el.style.opacity = op;
						el.fadeto = setTimeout(fadeIn, FRQ, el, op);
					}
				},
				
			// Fades out element in 1s
			fadeOut = function(el, opacity) {
				
					if (el.hasOwnProperty('fadeto')) {
						clearTimeout(el.fadeto);
					}
					
					let op = (typeof opacity !== 'undefined')? opacity : getOpacity(el);
					
					if (op > 0) {
						op = Math.max(0, op - FRQ / OUTDUR);
						el.style.opacity = op;
						el.fadeto = setTimeout(fadeOut, FRQ, el, op);
					} else {
						// Finished
						el.style.display = 'none';
					}
				},
				
			// Fades in all elements
			fadeInAll = function() {
				
					for (let el of elems) {
						if (el.offsetParent === null) {
							// Hidden: show first
							el.style.display = 'flex';
						}
						fadeIn(el);
					}
				},
				
			// Fades out all elements
			fadeOutAll = function() {
				
					for (let el of elems) { 
						fadeOut(el);
					}
				},
				
			// Handling click event
			handleClick = function(e) {
					
					if (opacity < .6) {
						// Intercept click only if controls are not (enough) visible
						clearTimeout(fto);
						e.stopPropagation();
						e.preventDefault();
						fadeInAll();
						return false;
					}
					
					return true;
				},
				
			// Handling mouse move event
			handleMouseMove = function(e) {
					
					clearTimeout(fto);		
					// Bringing controls/caption back if hidden
					fadeInAll();
					// Reinitiating after 3s of inactivity
					fto = setTimeout(fadeOutAll, MOVETO);
				};
			
		// Check if responsive and the elements exist
		if (document.body.classList.contains('responsive') && slideimg && elems) {
			
			// Listening to pointerup (happens before click)
			slideimg.addEventListener('click', handleClick);
			// Preventing fade out while mouse moves over the main image
			slideimg.addEventListener('mousemove', handleMouseMove);
			// Listening mouse move on controls/caption
			for (let el of elems) {
				el.addEventListener('mousemove', handleMouseMove);
			}
			// Auto fading out in 5s after page has loaded
			fto = setTimeout(fadeOutAll, LOADTO);
		}
	});