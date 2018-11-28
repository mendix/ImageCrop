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
            this.boundaryWidth ? options.boundary.width = this.boundaryWidth : false;
            this.boundaryHeight ? options.boundary.height = this.boundaryHeight : false;
        }

        // toggle zoomer, resize, and orientation
        this.enableZoomer && (options.enableZoomer = this.enableZoomer);
        this.enableResize && (options.enableResize = this.enableResize);
        this.enableOrientation && (options.enableOrientation = this.enableOrientation);

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

    _createControls() {
        this.log('_createControls');
        this.cropBtn = domCreate("button", {
            class: `btn btn-${this.cropButtonStyle} image-crop-controls__crop-btn`,
            innerHTML: "Crop"
        });
        domPlace(this.cropBtn, this.controlsWrapper);
        const cropEventHandler = on(this.cropBtn, "click", hitch(this, this._cropImage));
        this.eventHandlers.push(cropEventHandler);

        this._setControlOffset();

    },

    _setControlOffset() {
        this.log('_setControlOffset');
        if (!this.readOnly) {
            // get crop boundary height
            const cropBoundaryNode = domQuery(".cr-boundary", this.domNode)[0] || null;
            const cropBoundaryHeight = cropBoundaryNode ? (parseInt(cropBoundaryNode.style.height || cropBoundaryNode.offsetHeight, 10)) : 0;

            const zoomSliderWrapper = domQuery(".cr-slider-wrap", this.domNode)[0] || null;
            const zoomSliderWrapperHeight = zoomSliderWrapper ? (parseInt(zoomSliderWrapper.style.height || zoomSliderWrapper.offsetHeight, 10)) : 0;

            const controlsWrapperHeight = this.cropBtn ? (parseInt(this.controlsWrapper.style.height || this.controlsWrapper.offsetHeight, 10)) : 0;

            console.log(cropBoundaryHeight, zoomSliderWrapperHeight, controlsWrapperHeight);
            // make sure not to hide the widget.
            (cropBoundaryHeight + zoomSliderWrapperHeight + controlsWrapperHeight) && domStyleSet(this.domNode, "height", `${(cropBoundaryHeight + zoomSliderWrapperHeight + controlsWrapperHeight)}px`);
            (cropBoundaryHeight + zoomSliderWrapperHeight + controlsWrapperHeight) && domStyleSet(this.domNode, "margin-bottom", `${controlsWrapperHeight + this.cropWidgetWrapperBottomMargin}px`);
            //  set control bar position to 'absolute' and then set its top offset.
            //domStyleSet(this.controlsWrapper, `position`, `absolute`);
            // place controls bar under the zoom slider if exist
            /*if (this.enableZoomer) {

                const zoomSliderWrapper = domQuery(".cr-slider-wrap", this.domNode)[0] || null;
                zoomSliderWrapper && (domStyleSet(this.controlsWrapper, "top", `${zoomSliderWrapper.offsetTop + 30}px`)); // +30px as a margin.
            }*/
        }

    },

    resize() {
        this.log('resize');
        this._setControlOffset();
    }
});
