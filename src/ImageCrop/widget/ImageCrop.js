import { defineWidget, log, runCallback } from 'widget-base-helpers';
import { get as domStyleGet, set as domStyleSet } from 'dojo/dom-style';
import { create as domCreate, place as domPlace, empty as domEmpty } from 'dojo/dom-construct';
import { get as domAttrGet, set as domAttrSet } from 'dojo/dom-attr';
import Toggler from 'dojo/fx/Toggler';

import { hitch } from 'dojo/_base/lang';
import on from 'dojo/on';
import domQuery from 'dojo/query';
import { isMxImageObject } from './utils/MxDataUtils';

import { Croppie } from 'croppie/croppie';
import template from './ImageCrop.template.html';
import './ImageCrop.scss';

export default defineWidget('ImageCrop', template, {
	constructor() {
		this.log = log.bind(this);
		this.runCallback = runCallback.bind(this);
		this.eventHandlers = [];
		this.nextRotate = 0;
		this.contextObject = null;
		this.imageSrc = '';
		this.TAB_STATES = {
			CROP: 'CROP',
			PREVIEW: 'PREVIEW'
		};
		this.hasError = false; // set this to true when only the error could affect the rendering.
	},

	postCreate() {
		this.log('postCreate');
	},
	update(object, callback) {
		this.log('update');
		if (isMxImageObject(object)) {
			this.contextObject = object;
			this.imageSrc = `/file?fileID=${this.contextObject.get('FileID')}&${(+new Date()).toString(36)}`;
			if (!this.readOnly) {
				this._buildWidget();
				this._createNewCroppedImageObject(object.getEntity(), callback);
			} else {
				this._buildwidgetReadOnly();
				this.runCallback(callback, 'update');
			}
		} else {
			this._setErrorFeedbackNode(
				`Please place this widget in a context that inherits from 'System.Image' entity.`
			);
			this.hasError = true;
			this.runCallback(callback, 'update');
		}
	},

	_createNewCroppedImageObject(MxEntityName, callback) {
		this.log('postCreate');

		// set the name of the newly created image object for the resulted image.
		const ImageNameWithFormat = this.contextObject.get('Name');
		const originalImageName = ImageNameWithFormat.slice(0, ImageNameWithFormat.lastIndexOf('.'));
		const nextImageFormat = this.croppedImageFormat === 'jpeg' ? 'jpg' : this.croppedImageFormat;
		this.croppedImageName = `${originalImageName}_cropped.${nextImageFormat}`;
		mx.data.create({
			entity: MxEntityName,
			callback: hitch(this, (object) => {
				this.croppedImageMxObject = object;
				this.croppedImageMxObject.set('Name', this.croppedImageName);
				callback && this.runCallback(callback, 'return control to widget base');
			}),
			error: hitch(this, (error) => {
				domEmpty(this.domNode);
				this._setErrorFeedbackNode(
					`Oops, Something went wrong while initialzing the data structure required to receive the resulted image.`,
					this.domNode,
					this.domNode
				);
				this.hasError = true;
				console.error(error.message, error);
				callback && this.runCallback(callback, 'return control to widget base.');
			})
		});
	},

	_saveResultedImage(blob) {
		this.log('_saveResultedImage');
		if (mx.data.saveDocument) {
			mx.data.saveDocument(
				this.croppedImageMxObject.getGuid(),
				this.croppedImageName,
				{
					width: 180,
					height: 180
				},
				blob,
				hitch(this, () => {
					this._returnToUserHandling();
					this._createNewCroppedImageObject(this.contextObject.getEntity());
				}),
				hitch(this, (error) => {
					this._setErrorFeedbackNode(
						'Oops! Something went wrong, please check your console for more info about the error.'
					);
					console.error(error.message, error);
				})
			);
		} else if (mendix.lib.Upload) {
			const Uploader = mendix.lib.Upload;
			const croppedImageUploader = new Uploader({
				objectGuid: this.croppedImageMxObject.getGuid(),
				maxFileSize: blob.size,
				startUpload: () => {}, // a do nothing function as the uploader will call it, don't leave unset or null as the uploader will call it.
				finishUpload: () => {}, // the same as 'startupload'
				form: {
					mxdocument: {
						files: [ blob ]
					}
				},
				callback: hitch(this, () => {
					this._returnToUserHandling();
					this._createNewCroppedImageObject(this.contextObject.getEntity());
				}),
				error: hitch(this, (error) => {
					this._setErrorFeedbackNode(
						'Oops! Something went wrong, please check your console for more info about the error.'
					);
					console.error(error.message, error);
				})
			});
			croppedImageUploader.upload();
		}
	},

	_returnToUserHandling() {
		this.log('_returnToUserHandling');
		const paramsForCroppedImageHandler = {
			actionname: this.cropedImageMicroflowHandler,
			applyto: 'selection',
			guids: [ this.croppedImageMxObject.getGuid() ]
		};
		mx.data.action({
			params: paramsForCroppedImageHandler,
			origin: this.mxform,
			context: this.mxcontext,
			async: false,
			callback: hitch(this, () => {
				this.log('successfully triggered Microflow');
			}),

			error: hitch(this, (error) => {
				this._setErrorFeedbackNode(
					'Oops! Something went wrong, please check your console for more info about the error.'
				);
				console.error(error.message, error);
			})
		});
		if (this.originaLImageMicroflowHandler) {
			const paramsForOriginalImageHandler = {
				actionname: this.originaLImageMicroflowHandler,
				applyto: 'selection',
				guids: [ this.contextObject.getGuid() ]
			};
			mx.data.action({
				params: paramsForOriginalImageHandler,
				origin: this.mxform,
				context: this.mxcontext,
				async: false,
				callback: hitch(this, () => {
					this.log('successfully triggered Microflow');
				}),
				error: hitch(this, (error) => {
					this._setErrorFeedbackNode(
						'Oops! Something went wrong, please check your console for more info about the error.'
					);
					console.error(error.message, error);
				})
			});
		}
	},

	_getCropOptions() {
		this.log('_getCropOptions');
		const options = { enableZoom: false, enableResize: false }; // defaults
		//set view port props
		options.viewport = {};
		const initialViewPortDimension = Math.min(this.boundaryWidth, this.boundaryHeight);

		options.viewport.width = initialViewPortDimension;
		options.viewport.height = initialViewPortDimension;
		this.viewportType === 'circle' && (options.viewport.type = 'circle');
		this.viewportType === 'square' && (options.viewport.type = 'square');

		//set boundaries
		// set boundaries only if they are not zeros, otherwise it will be default to the container size.
		if (this.boundaryWidth !== 0 && this.boundaryHeight !== 0) {
			options.boundary = {};
			this.boundaryWidth && (options.boundary.width = this.boundaryWidth);
			this.boundaryWidth && (options.boundary.width = this.boundaryWidth);
			this.boundaryHeight && (options.boundary.height = this.boundaryHeight);
		}

		// toggle zoomer, resize, and orientation
		this.enableZoomer && (options.enableZoom = this.enableZoomer);
		this.enableResize && (options.enableResize = this.enableResize);
		options.enableOrientation = true; // required for rotation functionality.

		// set mouse wheel zoom option
		this.mouseWheelZoom === 'yes' && (options.mouseWheelZoom = true);
		this.mouseWheelZoom === 'yesWithCtrl' && (options.mouseWheelZoom = 'ctrl');
		this.mouseWheelZoom === 'no' && (options.mouseWheelZoom = false);

		return options;
	},

	async _cropImageForSave() {
		this.log('_cropImage');
		const croppedImageBlob = await this.crop.result(this._getCroppedImageOptions());
		this._saveResultedImage(croppedImageBlob);
	},
	_cropImageForView() {
		this.log('_cropImage');
		return this.crop.result(this._getCroppedImageOptions()); // a promise that resolves to blob
	},

	_getCroppedImageOptions() {
		this.log('_getCroppedImageOptions');
		const croppedImageQualityFloat = parseFloat(this.croppedImageQuality);
		let quality = 1;
		if (this.croppedImageFormat === 'jpeg') {
			quality =
				!isNaN(croppedImageQualityFloat) && croppedImageQualityFloat >= 0 && croppedImageQualityFloat <= 1
					? croppedImageQualityFloat
					: 1;
		}
		return {
			type: 'blob',
			format: this.croppedImageFormat,
			quality: quality,
			size: this.croppedImageSize,
			circle: this.viewportType === 'circle'
		};
	},
	_rotateLeft() {
		this.log('_rotateLeft');
		this.crop.rotate(90);
		this.nextRotate === 360 && (this.nextRotate = 0); // reset
		this.nextRotate += 90;
	},
	_rotateRight() {
		this.log('_rotateRight');
		this.crop.rotate(-90);
		this.nextRotate === -360 && (this.nextRotate = 0); // reset
		this.nextRotate -= 90;
	},

	_convertBlobToImageURL(blob) {
		this.log('_convertBlobToImageURL');
		const imageURL = URL.createObjectURL(blob);
		return imageURL;
	},

	_buildWidget() {
		this.log('_buildWidget');
		// cropping wrapper is where we're going to bind croppie instance.
		this.croppingWrapper = domCreate('div', {
			class: 'IC-cropping'
		});
		this.crop = new Croppie(this.croppingWrapper, this._getCropOptions());
		this.crop.bind({
			url: this.imageSrc
		});

		// create controls
		this.controlsWrapper = domCreate('div', {
			class: `btn-group btn-group-sm IC-cropping-controls 
            ${!this.enableZoomer && 'IC-cropping-controls--no-zoomer'}`
		});

		domStyleSet(this.controlsWrapper, 'width', this.boundaryWidth);

		this.cropBtn = domCreate('button', {
			class: `mx-button btn btn-${this.cropButtonStyle} IC-cropping__btn IC-cropping__btn--crop`
		});
		this.cropBtnIcon = domCreate('span', {
			class: 'glyphicon glyphicon-scissors'
		});
		domPlace(this.cropBtnIcon, this.cropBtn);

		this.rotateLeftBtn = domCreate('button', {
			class: `mx-button btn btn-default IC-cropping__btn IC-cropping__btn--rotate-l`
		});
		this.rotateLeftBtnIcon = domCreate('span', {
			class: 'glyphicon glyphicon-repeat'
		});
		domPlace(this.rotateLeftBtnIcon, this.rotateLeftBtn);

		this.rotateRightBtn = domCreate('button', {
			class: `mx-button btn btn-default IC-cropping__btn IC-cropping__btn--rotate-r`
		});
		this.rotateRightBtnIcon = domCreate('span', {
			class: 'glyphicon glyphicon-repeat'
		});
		domPlace(this.rotateRightBtnIcon, this.rotateRightBtn);

		domPlace(this.rotateLeftBtn, this.controlsWrapper);
		domPlace(this.cropBtn, this.controlsWrapper);
		domPlace(this.rotateRightBtn, this.controlsWrapper);

		const cropWithDebounce = this._withDebounce(this._cropImageForSave, 250);
		const cropEventHandler = on(this.cropBtn, 'click', cropWithDebounce);
		const rotateLeftEventHandler = on(this.rotateLeftBtn, 'click', hitch(this, this._rotateLeft));
		const rotateRightEventHandler = on(this.rotateRightBtn, 'click', hitch(this, this._rotateRight));
		this.eventHandlers.push(cropEventHandler);
		this.eventHandlers.push(rotateLeftEventHandler);
		this.eventHandlers.push(rotateRightEventHandler);

		// if preview option is enabled create tab container
		if (this.showPreview) {
			this.TabContainerWrapper = domCreate('div', {
				class: 'IC-tab-container'
			});

			this.TabControlsWrapper = domCreate('div', {
				class: 'btn-group btn-group-sm IC-tab-container__controls-wrapper'
			});

			domStyleSet(this.TabControlsWrapper, 'width', `${this.boundaryWidth}px`);

			this.cropTabButton = domCreate('button', {
				class: `mx-button btn btn-${this.cropButtonStyle} active IC-tab-control__btn`,
				innerHTML: 'Crop'
			});
			this.previewTabButton = domCreate('button', {
				class: `mx-button btn btn-${this.cropButtonStyle} IC-tab-control__btn`,
				innerHTML: 'Preview'
			});

			// palce buttons in the control wrapper
			domPlace(this.cropTabButton, this.TabControlsWrapper);
			domPlace(this.previewTabButton, this.TabControlsWrapper);
			// place the control wrapper in the container wrapper
			domPlace(this.TabControlsWrapper, this.TabContainerWrapper);

			// create tabs
			this.cropTab = domCreate('div', {
				class: 'tab-container-tab tab-container-crop'
			});
			this.previewTab = domCreate('div', {
				class: 'tab-container-tab tab-container-preview'
			});

			// create tabs togglers
			this.cropTabToggler = new Toggler({
				node: this.cropTab
			});
			this.previewTabToggler = new Toggler({
				node: this.previewTab
			});

			// create image preview elemnt
			this.imagePreviewNode = domCreate('img', {
				class: 'mx-image img-responsive IC-preview-image',
				src: '',
				width: this.boundaryWidth,
				height: this.boundaryHeight
			});
			this.imagePreviewNode.onload = () => {
				URL.revokeObjectURL(this.currentPreviewImageURL);
			};

			// set the initial active tab to be 'Crop tab'
			this.currnetTabState = this.TAB_STATES.CROP;
			domStyleSet(this.previewTab, 'display', 'none');
			this.cropTabToggler.show();
			this.previewTabToggler.hide();

			// wire these togglers with buttons

			const cropTabToggle = on(
				this.cropTabButton,
				'click',
				hitch(this, () => {
					if (this.currnetTabState === this.TAB_STATES.CROP) {
						return; // do nothing
					} else {
						this.previewTabToggler.hide();
						this.cropTabToggler.show();
						domStyleSet(this.previewTab, 'display', 'none');
						domStyleSet(this.cropTab, 'display', 'block');
						const cropTabNextClass = `${domAttrGet(this.cropTabButton, 'class')} active`;
						domAttrSet(this.cropTabButton, 'class', cropTabNextClass);
						const previewTabNextClass = domAttrGet(this.previewTabButton, 'class').replace('active', '');
						domAttrSet(this.previewTabButton, 'class', previewTabNextClass);
						this.currnetTabState = this.TAB_STATES.CROP;
					}
				})
			);
			const previewTabToggle = on(
				this.previewTabButton,
				'click',
				hitch(this, () => {
					if (this.currnetTabState === this.TAB_STATES.PREVIEW) {
						return; // do nothing
					} else {
						this.cropTabToggler.hide();
						this.previewTabToggler.show();
						domStyleSet(this.cropTab, 'display', 'none');
						domStyleSet(this.previewTab, 'display', 'block');
						const previewTabNextClass = `${domAttrGet(this.previewTabButton, 'class')} active`;
						domAttrSet(this.previewTabButton, 'class', previewTabNextClass);
						const cropTabNextClass = domAttrGet(this.cropTabButton, 'class').replace('active', '');
						domAttrSet(this.cropTabButton, 'class', cropTabNextClass);
						this.currnetTabState = this.TAB_STATES.PREVIEW;
					}
				})
			);

			const cropUpdateEvent = on(
				this.croppingWrapper,
				'update',
				hitch(this, async (cropWidgetEvent) => {
					// this is a custom event called when zooming, resizing, and selecting occurs on the cropping widget,
					this._resetCropperOffsets(); //
					const imageBlob = await this._cropImageForView();

					if (this.showPreview) {
						const imageURL = this._convertBlobToImageURL(imageBlob);
						this.currentPreviewImageURL = imageURL;
						this.imagePreviewNode.src = imageURL;
						this._resetCropperOffsets(); // called here again to overcome 'flickering' from preview image ON fast select/resize/zoom
					}
				})
			);

			this.eventHandlers.push(cropUpdateEvent);
			this.eventHandlers.push(cropTabToggle);
			this.eventHandlers.push(previewTabToggle);

			domPlace(this.croppingWrapper, this.cropTab);
			domPlace(this.controlsWrapper, this.cropTab);
			domPlace(this.imagePreviewNode, this.previewTab);

			domPlace(this.cropTab, this.TabContainerWrapper);
			domPlace(this.previewTab, this.TabContainerWrapper);

			domPlace(this.TabContainerWrapper, this.domNode);
		} else {
			// build widget without a preview tab.
			domPlace(this.croppingWrapper, this.domNode);
			domPlace(this.controlsWrapper, this.domNode);
		}
	},

	_buildwidgetReadOnly() {
		this.log('_buildwidgetReadOnly');
		this.imageReadOnlyView = domCreate('img', {
			class: 'mx-image img-reponsive IC-preview-image IC-preview-image--readonly',
			src: this.imageSrc,
			width: `${this.boundaryWidth}px`,
			height: `${this.boundaryHeight}px`
		});
		domPlace(this.imageReadOnlyView, this.domNode);
	},

	_resetCropperOffsets() {
		this.log('_resetCropperOffsets');
		/**
         * Croppie library doesn't come with a control bar to perform image transfomration
         * so this function makes sure that the control bar that we made is positioned properly
         * in the widget along with the zoomer.
         *
         * Important Note : should be invoked after initializing croppie.
         */

		const nextCroppedwidth = domStyleGet(domQuery('.cr-boundary', this.domNode)[0], 'width') || this.boundaryWidth;

		if (nextCroppedwidth >= this.boundaryWidth) {
			domStyleSet(this.controlsWrapper, 'width', `${nextCroppedwidth}px`);

			if (this.enableZoomer) {
				const zoomerWrapper = domQuery('.cr-slider-wrap', this.domNode)[0];
				zoomerWrapper && domStyleSet(zoomerWrapper, 'width', `${nextCroppedwidth}px`);
			}
			if (this.showPreview) {
				domStyleSet(this.TabContainerWrapper, 'width', `${nextCroppedwidth}px`);
				domStyleSet(this.TabControlsWrapper, 'width', `${nextCroppedwidth}px`);
				domStyleSet(this.imagePreviewNode, 'width', `${nextCroppedwidth}px`);
			}
		}
	},
	_setErrorFeedbackNode(errorMessage) {
		this.log('_setErrorFeedbackNode');
		let errorMessageNode = domQuery('.alert .alert-danger', this.domNode)[0];
		if (errorMessageNode) {
			domAttrSet(errorMessageNode, 'innerHTML', errorMessage);
		} else {
			errorMessageNode = domCreate('div', {
				class: 'alert alert-danger',
				innerHTML: errorMessage
			});
			const parentNodeNextClass = `${domAttrGet(this.domNode, 'class')} has-error`;
			domAttrSet(this.domNode, 'class', parentNodeNextClass);
			domPlace(errorMessageNode, this.domNode);
		}
	},
	resize() {
		this.log('resize');
		!this.readOnly && !this.hasError && this._resetCropperOffsets(); // reset offsets only and only when the widget has no errors affect its rendering & it's not readonly
	},

	uninitialize() {
		this.log('uninitialize');
		if (this.crop && this.crop.destroy) {
			this.crop.destroy(); // desstroy croppie instance and remove it from the dom.
		}
		// remove registered handlers
		this.eventHandlers.forEach((handler) => {
			handler.remove();
		});
	},

	/*
		* call the given function after the provided 'wait' time in ms
		* and when it stops being called.
		* used to handle million times pressing on the crop button
	*/
	_withDebounce(func, wait) {
		let timeout;
		return () => {
			const context = this;
			const args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				timeout = null;
				func.apply(context, args);
			}, wait);
		};
	}
});
