import {
    defineWidget,
    log,
    runCallback,
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
    place as domPlace
} from "dojo/dom-construct";

import {
    hitch
} from 'dojo/_base/lang';
import on from "dojo/on";
import domQuery from "dojo/query";
import {
    isMxImageObject
} from "./MxDataUtils";
import {
    setErrorFeedbackNode
} from "./WidgetDomUtils";

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

    },

    _initLocalVariables() {
        this.contextObject = null;
        this.imageSrc = "";

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

                this.croppingWrapper.addEventListener("update", hitch(this, this._resetCropperOffsets));
                this._createControls();
            }

        } else {
            setErrorFeedbackNode(`Please place this widget in a context that inherits from 'System.Image' entity.`, this.domNode, this.domNode);
        }
        this.runCallback(callback, "update");
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

    async _cropImage() {
        this.log('_cropImage');
        const croppedImageBlob = await this.crop.result('blob');
        console.log(croppedImageBlob);
    },
    _rotateLeft() {
        this.log('_rotateLeft');
        this.crop.rotate(90);

    },
    _rotateRight() {
        this.log('_rotateRight');
        this.crop.rotate(-90);
    },

    _createControls() {
        this.log('_createControls');
        this.controlsWrapper = domCreate("div", {
            class: `btn-group image-crop-controls`,
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
        }
        domPlace(this.rotateLeftBtn, this.controlsWrapper);
        domPlace(this.cropBtn, this.controlsWrapper);
        domPlace(this.rotateRightBtn, this.controlsWrapper);
        domPlace(this.controlsWrapper, this.croppingWrapper);


        const cropEventHandler = on(this.cropBtn, "click", hitch(this, this._cropImage));
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
            this.boundaryWidth && (domStyleSet(this.controlsWrapper, "width", `${cropBoundaryWidth}px`));
        }

    },

    resize() {
        this.log('resize');
        this._resetCropperOffsets();
    }
});
