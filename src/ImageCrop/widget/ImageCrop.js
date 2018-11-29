import {
    defineWidget,
    log,
    runCallback,
    execute as executeMF
} from 'widget-base-helpers';
import {
    set as domAttrSet,
    get as domAttrGet
} from "dojo/dom-attr";
import {
    get as domStyleGet,
    set as domStyleSet
} from "dojo/dom-style";
import {
    create as domCreate,
    place as domPlace,
    empty as domEmpty
} from "dojo/dom-construct";

import {
    hitch
} from 'dojo/_base/lang';
import on from "dojo/on";
import domQuery from "dojo/query";
import {
    isMxImageObject
} from "./utils/MxDataUtils";
import {
    setErrorFeedbackNode
} from "./utils/WidgetDomUtils";

import {
    Croppie
} from 'croppie/croppie';





import template from "./ImageCrop.template.html";
import "./ImageCrop.scss";

export default defineWidget('ImageCrop', template, {



    constructor() {
        this.log = log.bind(this);
        this.runCallback = runCallback.bind(this);
        this.eventHandlers = [];
        this.nextRotate = 0;

    },

    _initLocalVariables() {
        this.contextObject = null;
        this.imageSrc = "";

    },

    _initCropedImageObject(MxEntityName, callback) {
        this.log('postCreate');
        mx.data.create({
            entity: MxEntityName,
            callback: hitch(this, (object) => {
                this.croppedImageMxObject = object;
                this.runCallback(callback, "return control to widget base");
            }),
            error: hitch(this, (error) => {
                setErrorFeedbackNode(`Oops, Something went wrong while initialzing the data structure required to receive the resulted image.`, this.domNode, this.domNode);
                console.error(error.message, error);
                this.runCallback(callback, "return control to widget base.");
            })
        });
    },

    _saveResultedImage(blob) {
        this.log('_saveResultedImage');
        if (mx.data.saveDocument) {
            mx.data.saveDocument(this.croppedImageMxObject.getGuid(), `${this.contextObject.get("Name")}_cropped${new Date().getUTCDate()}`, {
                width: 180,
                height: 180
            }, blob, hitch(this, this._returnToUserHandling), error => {
                setErrorFeedbackNode("Oops! Something went wrong, please check your cosole for more info about the erro.");
                console.error(error.message, error);
            });
        } else if (mendix.lib.Upload) {
            const Uploader = mendix.lib.Upload;
            const croppedImageUploader = new Uploader({
                objectGuid: this.croppedImageMxObject.getGuid(),
                maxFileSize: blob.size,
                startUpload: null,
                finishUpload: null,
                form: {
                    mxdocument: {
                        files: [
                            blob
                        ]
                    }
                },
                callback: hitch(this, this._returnToUserHandling),
                error: hitch(this, (error) => {
                    setErrorFeedbackNode("Oops! Something went wrong, please check your cosole for more info about the erro.");
                    console.error(error.message, error);
                })
            });
            croppedImageUploader.upload();
        }
    },


    _returnToUserHandling() {
        this.log("_returnToUserHandling");
        executeMF.call(this, this.cropedImageMicroflowHandler, this.croppedImageMxObject.getGuid(), () => {
            this.log("successfully triggered Microflow")
        });
    },


    postCreate() {
        this.log('postCreate');
        this._initLocalVariables();
        window.test = this;
    },
    update(object, callback) {
        this.log('update');
        if (isMxImageObject(object)) {
            if (!this.readOnly) {
                this.contextObject = object;
                this.imageSrc = `/file?fileID=${this.contextObject.get('FileID')}&${(+new Date()).toString(36)}`;
                //domAttrSet(this.imageNode, "src", this.imageSrc);
                this.crop = new Croppie(this.croppingWrapper, this._getCropOptions());
                this.crop.bind({
                    url: this.imageSrc,
                });

                this.croppingWrapper.addEventListener("update", hitch(this, (cropUpdateEvent) => {
                    this._resetCropperOffsets();
                    this._cropImageForView();
                }));
                this._createControls();
                this._initCropedImageObject(object.getEntity(), callback);

            }

        } else {
            setErrorFeedbackNode(`Please place this widget in a context that inherits from 'System.Image' entity.`, this.domNode, this.domNode);
            this.runCallback(callback, "update");
        }

    },


    _getCropOptions() {
        this.log('_getCropOptions');
        const options = {};
        //set view port props
        options.viewport = {};
        options.viewport.width = this.viewportWidth;
        options.viewport.height = this.viewportHeight;
        this.viewportType === "circle" && (options.viewport.type = "circle");
        this.viewportType === "square" && (options.viewport.type = "square");


        //set boundaries
        // set boundaries only if they are not zeros, otherwise it will be default to the container size.
        if (this.boundaryWidth !== 0 && this.boundaryHeight !== 0) {
            options.boundary = {};
            this.boundaryWidth && (options.boundary.width = this.boundaryWidth);
            this.boundaryWidth && (options.boundary.width = this.boundaryWidth);
            this.boundaryHeight && (options.boundary.height = this.boundaryHeight);

        }

        // toggle zoomer, resize, and orientation
        this.enableZoomer && (options.enableZoomer = this.enableZoomer);
        this.enableResize && (options.enableResize = this.enableResize);
        options.enableOrientation = true; // required for rotation functionality.

        // set mouse wheel zoom option
        this.mouseWheelZoom === 'yes' && (options.mouseWheelZoom = true);
        this.mouseWheelZoom === 'yesWithCtrl' && (options.mouseWheelZoom = 'ctrl');
        this.mouseWheelZoom === 'no' && (options.mouseWheelZoom = false);


        console.log(options);
        return options;
    },

    async _cropImageForSave() {
        this.log('_cropImage');
        const croppedImageBlob = await this.crop.result(this._getCroppedImageOptions('blob'));
        this._saveResultedImage(croppedImageBlob);
        console.log(croppedImageBlob);
    },
    async _cropImageForView() {
        this.log('_cropImage');
        const croppedImageHTML = await this.crop.result(this._getCroppedImageOptions('html'));
        domStyleSet(this.croppedImageViewWrapper, "display", "block");
        domEmpty(this.croppedImageViewWrapper);
        domPlace(croppedImageHTML, this.croppedImageViewWrapper);
        /*if (!this.croppedImageMxObject) {

        }*/
    },

    _getCroppedImageOptions(type) {
        this.log('_getCroppedImageOptions');
        const quality = (isNaN(parseFloat(this.croppedImageQuality)) && parseFloat(this.croppedImageQuality) >= 0 && parseFloat(this.croppedImageQuality) <= 1) ? parseFloat(this.croppedImageQuality) : 1;
        return {
            type: type,
            format: this.croppedImageFormat,
            quality: quality,
            size: this.croppedImageSize,
            circle: this.croppedImageIsCircle
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

    _createControls() {
        this.log('_createControls');
        this.controlsWrapper = domCreate("div", {
            class: `btn-group image-crop-controls`,
        });
        this.croppedImageViewWrapper = domCreate("div", {
            class: `image-crop-cropped-image-viewer`,
        });

        this.cropBtn = domCreate("button", {
            class: `btn btn-${this.cropButtonStyle} btn-${this.cropButtonPosition} image-crop-btn image-crop-btn--crop`,
            innerHTML: "Crop"
        });
        this.rotateLeftBtn = domCreate("button", {
            class: `btn btn-${this.cropButtonStyle} btn-${this.cropButtonPosition} image-crop-btn image-crop-btn--rotate-l`,
            innerHTML: "Rotate Left"
        });
        this.rotateRightBtn = domCreate("button", {
            class: `btn btn-${this.cropButtonStyle} btn-${this.cropButtonPosition} image-crop-btn image-crop-btn--rotate-r`,
            innerHTML: "Rotate Right"
        });
        if (this.cropWidgetWrapperBottomMargin) {
            domStyleSet(this.cropBtn, "margin-bottom", `${this.cropWidgetWrapperBottomMargin}px`);
            domStyleSet(this.rotateLeftBtn, "margin-bottom", `${this.cropWidgetWrapperBottomMargin}px`);
            domStyleSet(this.rotateRightBtn, "margin-bottom", `${this.cropWidgetWrapperBottomMargin}px`);
            domStyleSet(this.croppedImageViewWrapper, "margin-bottom", `${this.cropWidgetWrapperBottomMargin}px`);
        }
        domPlace(this.rotateLeftBtn, this.controlsWrapper);
        domPlace(this.cropBtn, this.controlsWrapper);
        domPlace(this.rotateRightBtn, this.controlsWrapper);
        domPlace(this.controlsWrapper, this.croppingWrapper);
        domPlace(this.croppedImageViewWrapper, this.croppingWrapper);


        const cropEventHandler = on(this.cropBtn, "click", hitch(this, this._cropImageForSave));
        const rotateLeftEventHandler = on(this.rotateLeftBtn, "click", hitch(this, this._rotateLeft));
        const rotateRightEventHandler = on(this.rotateRightBtn, "click", hitch(this, this._rotateRight));
        this.eventHandlers.push(cropEventHandler);
        this.eventHandlers.push(rotateLeftEventHandler);
        this.eventHandlers.push(rotateRightEventHandler);

        this._resetCropperOffsets();

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
        if (!this.readOnly) {

            const cropBoundaryNode = domQuery(".cr-boundary", this.domNode)[0] || null;
            const cropBoundaryWidth = cropBoundaryNode ? (parseInt(cropBoundaryNode.style.width || cropBoundaryNode.offsetWidth, 10)) : 0;


            const cropSliderWrapper = domQuery(".cr-slider-wrap", this.domNode)[0] || null;

            this.enableZoomer && (domStyleSet(cropSliderWrapper, "width", `${cropBoundaryWidth}px`));
            cropBoundaryWidth && (domStyleSet(this.controlsWrapper, "width", `${cropBoundaryWidth}px`));
            cropBoundaryWidth && (domStyleSet(this.croppedImageViewWrapper, "width", `${cropBoundaryWidth}px`));
        }

    },

    resize() {
        this.log('resize');
        this._resetCropperOffsets();
    }
});
