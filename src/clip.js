(function(factory){
	this.xClip = factory();
})(function(){
	function Clip(options){
		this.frameEdge = 300;
		this.pre1Edge = 128;
		this.pre2Edge = 64;

		this.container = document.querySelector(options.container);
	}
	Clip.prototype.init = function(){
		this.initDom();
		this.initEvent();
		
		// 绘制遮罩层
		var octx = this.overlayCanvas.getContext('2d');
		octx.fillStyle = 'rgba(0, 0, 0, 0.4)';
		octx.fillRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
		octx.globalCompositeOperation = 'destination-out';
		octx.arc(this.overlayCanvas.width / 2, this.overlayCanvas.width / 2, this.overlayCanvas.width / 2, 0, 2 * Math.PI);
		octx.fillStyle = '#ffffff';
		octx.fill();

		// 
		this.mainCtx = this.mainCanvas.getContext('2d');
		this.pre1Ctx = this.pre1Canvas.getContext('2d');
		this.pre2Ctx = this.pre2Canvas.getContext('2d');
		this.mainScale = 1;
		// tmpScale;
		this.pre1Scale = 1
		this.pre2Scale = 1;
		
		this.img = new Image();
		this.imgMinEdge = 0;
		this.img.src = "shu.jpg";
		this.img.onload = function(){
			if(this.img.width > this.img.height){
				// 只能横向移动
				this.moveDirection = 0;
				this.imgMinEdge = this.img.height;
				this.mainScale /*= tmpScale */= this.frameEdge / this.img.height;
			}else{
				// 只能竖向移动
				this.moveDirection = 1;
				this.imgMinEdge = this.img.width;
				this.mainScale = /*tmpScale =*/ this.frameEdge / this.img.width;
			}
			this.pre1Scale = this.pre1Edge / this.imgMinEdge;
			this.pre2Scale = this.pre2Edge / this.imgMinEdge;

			this.mainCanvas.width = this.img.width;
			this.mainCanvas.height = this.img.height;

			this.mainCtx.scale(this.mainScale, this.mainScale);
			this.pre1Ctx.scale(this.pre1Scale, this.pre1Scale);
			this.pre2Ctx.scale(this.pre2Scale, this.pre2Scale);

			this.draw(this.mainCtx, false, this.mainCanvas.width, this.mainCanvas.height);	
			this.drawPreview();
		}.bind(this);

		return this;
	};
	Clip.prototype.initDom = function(){
		this.dom = document.createElement('div');
		this.dom.setAttribute('class', 'x-clip');

		this.mainDom = document.createElement('div');
		this.mainDom = document.createElement('div');
		this.mainDom.setAttribute('class', 'main');
		this.mainDom.style.width = this.mainDom.style.height = this.frameEdge + 'px';
		this.overlayCanvas = document.createElement('canvas');
		this.mainCanvas = document.createElement('canvas');

		this.overlayCanvas.setAttribute('class', 'overlay');
		this.mainCanvas.setAttribute('class', 'main-canvas');

		this.mainDom.appendChild(this.overlayCanvas);
		this.mainDom.appendChild(this.mainCanvas);

		this.previewDom = document.createElement('div');
		this.previewDom.setAttribute('class', 'preview');
		this.pre1Canvas = document.createElement('canvas');
		this.pre2Canvas = document.createElement('canvas');
		this.pre1Canvas.width = this.pre1Canvas.height = this.pre1Edge;
		this.pre2Canvas.width = this.pre2Canvas.height = this.pre2Edge;

		this.previewDom.appendChild(this.pre1Canvas);
		this.previewDom.appendChild(this.pre2Canvas);
		// this.mainCtx = this.mainCanvas.getContext('2d');

		this.overlayCanvas.height = this.overlayCanvas.width = this.frameEdge;
		this.dom.appendChild(this.mainDom);
		this.dom.appendChild(this.previewDom);

		this.container.appendChild(this.dom);

		return this;
	};
	Clip.prototype.initEvent = function(){
		// 绑定鼠标和触屏事件
		var isMoving = false, pos = {x: 0, y: 0}, originPos = {x: this.mainCanvas.offsetLeft, y: this.mainCanvas.offsetTop};
		this.mainDom.addEventListener('mousedown', function(e){
			isMoving = true;
			pos.x = e.pageX;
			pos.y = e.pageY;
		}.bind(this));
		this.mainDom.addEventListener('mousemove', function(e){
			if(isMoving){
				if(!this.moveDirection){
					var left = e.pageX - pos.x + originPos.x;
					if(left >= 0){
						left = 0;
					}else if(Math.abs(left) + this.frameEdge >= this.img.width * this.mainScale){
						left = -(this.img.width * this.mainScale - this.frameEdge);
					}
					this.mainCanvas.style.left = left + 'px';
				}else{
					var top = e.pageY - pos.y + originPos.y;
					if(top >= 0){
						top = 0;
					}else if(Math.abs(top) + this.frameEdge >= this.img.height * this.mainScale){
						top = -(this.img.height * this.mainScale - this.frameEdge);
					}
					this.mainCanvas.style.top = top + 'px';
				}
				this.drawPreview();
			}
		}.bind(this));
		function cancelMove(e){
			isMoving = false;
			originPos = {x: this.mainCanvas.offsetLeft, y: this.mainCanvas.offsetTop};
		}
		this.mainDom.addEventListener('mouseup', cancelMove.bind(this));
		this.mainDom.addEventListener('mouseout', cancelMove.bind(this));
		// this.mainDom.addEventListener('mousewheel', function(e){
		// 	console.log(e.wheelDelta)
		// 	// 向上滚，放大
		// 	if(e.wheelDelta > 0){
		// 		if(tmpScale < 1){
		// 			tmpScale = tmpScale * 1.4;
		// 			if(tmpScale > 1){
		// 				// tmpScale = 1;
		// 			}
		// 		}
		// 	}else{
		// 		if(tmpScale > scale){
		// 			tmpScale = tmpScale / 1.4;
		// 			if(tmpScale < scale){
		// 				// tmpScale = scale;
		// 			}
		// 		}
		// 	}
		// 	console.log(tmpScale)
		// 	draw(tmpScale);
		// });

		return this;
	};
	Clip.prototype.draw = function(ctx, clip, width, height){
		ctx.clearRect(0, 0, width, height);
		if(clip){
			ctx.drawImage(this.img, Math.abs(this.mainCanvas.offsetLeft) / this.mainScale, 0, this.imgMinEdge, this.imgMinEdge, 0, 0, width, height);
		}else{
			ctx.drawImage(this.img, 0, 0);
		}

		return this;
	};
	Clip.prototype.drawPreview = function(){
		var pre1SacleEdge = this.pre1Edge / this.pre1Scale, pre2SacleEdge = this.pre2Edge / this.pre2Scale;
		this.draw(this.pre1Ctx, true, pre1SacleEdge, pre1SacleEdge);
		this.draw(this.pre2Ctx, true, pre2SacleEdge, pre2SacleEdge);

		this.drawOverlay(this.pre1Ctx, pre1SacleEdge/2, pre1SacleEdge/2, pre1SacleEdge/2);
		this.drawOverlay(this.pre2Ctx, pre2SacleEdge/2, pre2SacleEdge/2, pre2SacleEdge/2);

		return this;
	};
	Clip.prototype.drawOverlay = function(ctx, x, y, radius){
		var globalCompositeOperation = ctx.globalCompositeOperation;
		ctx.globalCompositeOperation = 'destination-in';
		ctx.arc(x, y, radius, 0, 2 * Math.PI);
		ctx.fillStyle = '#ffffff';
		ctx.fill();
		ctx.globalCompositeOperation = globalCompositeOperation;

		return this;
	};
	Clip.prototype.cut = function(isRect){
		var imgData = this.mainCtx.getImageData(Math.abs(this.mainCanvas.offsetLeft), 0, this.frameEdge, this.frameEdge);
		var canvas = document.createElement('canvas');
		canvas.width = canvas.height = this.frameEdge;
		var cctx = canvas.getContext('2d');
		cctx.putImageData(imgData, 0, 0);
		if(!isRect){
			this.drawOverlay(cctx, this.frameEdge / 2, this.frameEdge / 2, this.frameEdge / 2);
		}
		return canvas.toDataURL();
	};
	// Clip.prototype.
	return Clip;
});