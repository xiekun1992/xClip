(function(factory){
	this.xClip = factory();
})(function(){
	function Clip(options){
		this.frameEdge = 300;
		this.pre1Edge = 128;
		this.pre2Edge = 64;

		this.moveDirection = 0;
		this.towards = 0;

		this.container = document.querySelector(options.container);
		this.options = {
			img: options.img
		}
		this.originPos = {x: 0, y: 0};
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

		this.mainCtx = this.mainCanvas.getContext('2d');
		this.pre1Ctx = this.pre1Canvas.getContext('2d');
		this.pre2Ctx = this.pre2Canvas.getContext('2d');
		this.mainScale = 1;
		this.pre1Scale = 1
		this.pre2Scale = 1;
		
		this.img = new Image();
		this.imgMinEdge = 0;
		this.img.src = this.options.img;
		this.img.onload = function(){
			this.imgWidth = this.img.width;
			this.imgHeight = this.img.height;
			if(this.img.width > this.img.height){
				// 只能横向移动
				this.moveDirection = 0;
				this.towards = 0;
				this.imgMinEdge = this.img.height;
				this.mainScale = this.frameEdge / this.img.height;
			}else{
				// 只能竖向移动
				this.moveDirection = 1;
				this.towards = 1;
				this.imgMinEdge = this.img.width;
				this.mainScale = this.frameEdge / this.img.width;
			}
			this.pre1Scale = this.pre1Edge / this.imgMinEdge;
			this.pre2Scale = this.pre2Edge / this.imgMinEdge;

			this.mainCanvas.width = this.frameEdge;
			this.mainCanvas.height = this.frameEdge;
			// this.mainCanvas.width = this.img.width;
			// this.mainCanvas.height = this.img.height;
			// // 当图片的尺寸小于编辑框的尺寸时，设置图片大小填充满编辑框
			// if(this.mainCanvas.width < this.frameEdge){
			// 	this.mainCanvas.width = this.frameEdge;
			// 	this.mainCanvas.height = this.img.height / this.img.width * this.mainCanvas.width;
			// }
			// if(this.mainCanvas.height < this.frameEdge){
			// 	this.mainCanvas.height = this.frameEdge;
			// 	this.mainCanvas.width = this.img.width / this.img.height * this.mainCanvas.height;
			// }
			// this.mainCtx.translate(this.frameEdge/2, this.frameEdge/2);

			// this.mainCtx.scale(this.mainScale, this.mainScale);
			// this.pre1Ctx.scale(this.pre1Scale, this.pre1Scale);
			// this.pre2Ctx.scale(this.pre2Scale, this.pre2Scale);

			this.draw(this.mainCtx, false, this.mainCanvas.width, this.mainCanvas.height);
			// this.drawPreview();
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
		this.mainDom.addEventListener('contextmenu', function(e){
			e.stopPropagation();
			e.preventDefault();
		});
		// 绑定鼠标和触屏事件
		var isMoving = false, pos = {x: 0, y: 0}, left, top;
		
		this.mainDom.addEventListener('mousedown', function(e){
			isMoving = true;
			pos.x = e.pageX;
			pos.y = e.pageY;
		}.bind(this));
		this.mainDom.addEventListener('mousemove', function(e){
			if(isMoving){
				if(!this.moveDirection){
					top = 0;
					if(this.towards == this.moveDirection || this.towards == 2){
						console.log(this.towards);
						left = e.pageX - pos.x + this.originPos.x;
					}else{
						// 旋转后的朝向和初始方向不同时，图片的拖动方式改变为竖向
						if(this.towards == 3){
							top = left = this.originPos.y - (e.pageY - pos.y);
						}else{
							top = left = e.pageY - pos.y + this.originPos.y;
						}
					}
					if(left >= 0){
						left = top = 0;
						// left = 0;
					}else if(Math.abs(left) + this.frameEdge >= this.imgWidth){
						left = top = -(this.imgWidth - this.frameEdge);
					}
					this.mainCtx.clearRect(0, 0, this.frameEdge, this.frameEdge);
					this.mainCtx.drawImage(this.img, 0, 0, this.imgWidth, this.imgHeight, left, 0, this.imgWidth, this.imgHeight);
					console.log(top, left);
				}else{
					left = 0;
					if(this.towards == this.moveDirection || this.towards == 3){
						console.log(this.towards);
						top = e.pageY - pos.y + this.originPos.y;
					}else{
						// 旋转后的朝向和初始方向不同时，图片的拖动方式改变为横向
						// left = top = e.pageX - pos.x + this.originPos.x;
						if(this.towards == 2){
							left = top = this.originPos.x - (e.pageX - pos.x);
						}else{
							left = top = e.pageX - pos.x + this.originPos.x;
						}
					}
					if(top >= 0){
						left = top = 0;
						// top = 0;
					}else if(Math.abs(top) + this.frameEdge >= this.imgHeight){
						left = top = -(this.imgHeight - this.frameEdge);
					}
					this.mainCtx.clearRect(0, 0, this.frameEdge, this.frameEdge);
					this.mainCtx.drawImage(this.img, 0, 0, this.imgWidth, this.imgHeight, 0, top, this.imgWidth, this.imgHeight);
					console.log(top, left);
				}
				// this.drawPreview();
			}
			return false;
		}.bind(this));
		function cancelMove(e){
			isMoving = false;
			this.originPos.x = left || 0;
			this.originPos.y = top || 0;
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
	Clip.prototype.rotateLeft = function(){
		this.mainCtx.translate(this.frameEdge, 0);
		this.mainCtx.rotate(Math.PI / 2);
		this.rotate();
	};
	Clip.prototype.rotateRight = function(){
		this.mainCtx.translate(0, this.frameEdge);
		this.mainCtx.rotate(Math.PI / -2);
		this.rotate();
	};
	Clip.prototype.rotate = function(ctx){
		// 设置拖动方向
		this.towards = ++this.towards % 4;
		console.log(this.originPos.x, this.originPos.y);
		this.draw(this.mainCtx, false, this.mainCanvas.width, this.mainCanvas.height);
	};
	Clip.prototype.draw = function(ctx, clip, width, height){
		ctx.clearRect(0, 0, width, height);
		if(clip){
			ctx.drawImage(this.img, Math.abs(this.originPos.x) / this.mainScale, Math.abs(this.originPos.y) / this.mainScale, this.imgMinEdge, this.imgMinEdge, 0, 0, width, height);
		}else{
			ctx.drawImage(this.img, Math.abs(this.originPos.x), Math.abs(this.originPos.y), this.img.width, this.img.height, 0, 0, this.img.width, this.img.height);

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
	return Clip;
});