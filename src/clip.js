(function(factory){
	this.xClip = factory();
})(function(){
	function Clip(options){
		this.container = options.container;
		this.imagePath = options.imagePath || '';
		this.addOverlay = options.addOverlay || false;

		this.edge = options.edge || 300;
		this.originPos = {x: 0, y: 0};
		this.scale = 1;

		this.rotationImages = []
		this.rotatePos = 0; // 1: right, 2: down, 3: left, 4: up

		this.img = new Image();
		this.imgWidth = this.imgHeight = 0;
	}
	Clip.prototype.init = function(){
		this.initDom();
		this.initEvent();

		this.ctx = this.mainCanvas.getContext('2d');
		var overlayCtx = this.overlayCanvas.getContext('2d');
		// img.src = 'small.png';
		this.img.src = this.imagePath;
		this.img.onload = function(){
			this.imgWidth = this.img.width;
			this.imgHeight = this.img.height;
			// 将大图等比例缩小到方框的大小，将小图等比例放大到方框的大小
			this.scale = this.edge / Math.min(this.img.width, this.img.height);
			// 默认居中显示
			this.originPos = {
				x: (this.edge - this.imgWidth * this.scale) / 2, 
				y: (this.edge - this.imgHeight * this.scale) / 2
			};
			this.draw();
			// 计算旋转用到的各角度的图片
			this.rotationImages = createRotationImage(this.img, this.edge);
		}.bind(this);
		this.addOverlay && this.drawOverlay(overlayCtx, this.edge / 2, this.edge / 2, this.edge / 2);
		return this;
	};
	Clip.prototype.initDom = function(){
		this.dom = document.createElement('div');
		this.dom.setAttribute('class', 'x-clip');

		this.overlayCanvas = document.createElement('canvas');
		this.mainCanvas = document.createElement('canvas');

		this.overlayCanvas.width = this.overlayCanvas.height = this.mainCanvas.width = this.mainCanvas.height = this.edge;
		this.dom.style.width = this.dom.style.height = this.edge + 'px';

		this.overlayCanvas.setAttribute('class', 'overlay');
		this.mainCanvas.setAttribute('class', 'main-canvas');

		this.dom.appendChild(this.overlayCanvas);
		this.dom.appendChild(this.mainCanvas);
		this.container.appendChild(this.dom);
		return this;
	};
	Clip.prototype.initEvent = function(){
		// 移动交互
		var mousedownPos = {x: 0, y: 0}, moving = false;
		this.dom.addEventListener('mousedown', function(e){
			mousedownPos.x = e.pageX;
			mousedownPos.y = e.pageY;
			moving = true;
		});
		this.dom.addEventListener('mousemove', function(e){
			if(moving){
				var deltaPos = {x: 0, y: 0};
				deltaPos.x = e.pageX - mousedownPos.x;
				deltaPos.y = e.pageY - mousedownPos.y;
				mousedownPos.x = e.pageX;
				mousedownPos.y = e.pageY;
				this.move(deltaPos.x, deltaPos.y);
			}
		}.bind(this));
		this.dom.addEventListener('mouseup', cancelMove);
		this.dom.addEventListener('mouseout', cancelMove);
		this.dom.addEventListener('mouseleave', cancelMove);
		function cancelMove(){
			moving = false;
		}
		// 缩放交互
		this.dom.addEventListener('mousewheel', function(e){
			if(e.wheelDelta > 0){
				this.zoom(true);
			}else{
				this.zoom(false);
			}
		}.bind(this));
	};
	Clip.prototype.move = function(deltaX, deltaY){
		// 移动
		this.originPos.x += deltaX;
		this.originPos.y += deltaY;
		this.draw();
	}
	Clip.prototype.rotate = function(isRotateLeft){
		if(isRotateLeft){
			this.rotatePos++;
		}else{
			this.rotatePos--;	
		}
		this.img = this.rotationImages[Math.abs(this.rotatePos) % this.rotationImages.length];
		this.imgWidth = this.img.width;
		this.imgHeight = this.img.height;
		var delta = Math.abs(this.imgWidth - this.imgHeight) / 2 * this.scale;
		if(this.imgWidth < this.imgHeight){
		 	this.originPos.x += delta;
		 	this.originPos.y -= delta;
		}else{
			this.originPos.x -= delta;
		 	this.originPos.y += delta;
		}
		this.draw();
	};
	Clip.prototype.zoom = function(isZoomIn){
		var increment = 0.01;
		if(isZoomIn){
			if(this.scale + increment > 1){
				return;
			}
			this.scale += increment;
			increment = -increment;
		}else{
			this.scale -= increment;
			if(this.scale * Math.min(this.img.width, this.img.height) < this.edge){
				this.scale = this.edge / Math.min(this.img.width, this.img.height);
				return ;
			}
		}
		this.originPos.x = this.originPos.x + increment * this.imgWidth / 2;
		this.originPos.y = this.originPos.y + increment * this.imgHeight / 2;
		this.draw();
	}
	Clip.prototype.draw = function(){
		this.edgeExceedCheck();
		this.ctx.clearRect(0, 0, this.edge, this.edge);
		this.ctx.drawImage(this.img, 0, 0, this.imgWidth, this.imgHeight, this.originPos.x, this.originPos.y, this.imgWidth * this.scale, this.imgHeight * this.scale);
		return this;
	};
	Clip.prototype.edgeExceedCheck = function(){
		// 纠正变换后图片超出边界
		if(this.originPos.x > 0){
			this.originPos.x = 0;
		}
		if(this.originPos.y > 0){
			this.originPos.y = 0;
		}
		if(this.originPos.x + this.imgWidth * this.scale < this.edge){
			this.originPos.x = this.edge - this.imgWidth * this.scale;
		}
		if(this.originPos.y + this.imgHeight * this.scale < this.edge){
			this.originPos.y = this.edge - this.imgHeight * this.scale;
		}
	}
	// 旋转
	function createRotationImage(img, frameEdge){
		var imgs = [];
		var tmpCanvas = document.createElement('canvas');
		var tmpCtx = tmpCanvas.getContext('2d');

		function rotateAndDraw(img, degree, x, y){
			var edge = Math.min(img.width, img.height);
			// 修改画布的大小以显示完整图片
			if(x == y){
				tmpCanvas.width = img.width;
				tmpCanvas.height = img.height;
			}else{
				tmpCanvas.width = img.height;
				tmpCanvas.height = img.width;
			}
			tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);

			tmpCtx.translate(x * edge, y * edge);
			tmpCtx.rotate(degree);
			
			var deltaX, deltaY;
			if(img.width < img.height){
				deltaY = x * (edge - img.height);
				deltaX = 0;
			}else{
				deltaX = y * (edge - img.width);
				deltaY = 0;
			}
			tmpCtx.drawImage(img, 0, 0, img.width, img.height, deltaX, deltaY, img.width, img.height);

			var rImg = new Image();
			rImg.src = tmpCanvas.toDataURL();
			return rImg;
		}
		// 初始图片
		imgs[0] = rotateAndDraw(img, 0, 0, 0);
		// 顺时针90度
		imgs[1] = rotateAndDraw(img, Math.PI / 2, 1, 0);
		// 顺时针180度
		imgs[2] = rotateAndDraw(img, Math.PI, 1, 1);
		// 顺时针270度
		imgs[3] = rotateAndDraw(img, Math.PI / 2 * 3, 0, 1);
		return imgs;
	}
	Clip.prototype.drawOverlay = function(ctx, x, y, radius){
		var globalCompositeOperation = ctx.globalCompositeOperation;
		ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
		ctx.fillRect(0, 0, x * 2, y * 2);
		ctx.globalCompositeOperation = 'destination-out';
		ctx.arc(x, y, radius, 0, 2 * Math.PI);
		ctx.fillStyle = '#ffffff';
		ctx.fill();
		ctx.globalCompositeOperation = globalCompositeOperation;

		return this;
	};
	Clip.prototype.cut = function(){
		return this.mainCanvas.toDataURL();
	};
	return Clip;
});