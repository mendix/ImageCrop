import {
    defineWidget,
    log,
    runCallback,
} from 'widget-base-helpers';
import {
    set as domAttrSet
} from "dojo/dom-attr";
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
            this.contextObject = object;
            this.imageSrc = `/file?fileID=${this.contextObject.get('FileID')}&${(+new Date()).toString(36)}`;
            //domAttrSet(this.imageNode, "src", this.imageSrc);
            this.crop = new Croppie(this.domNode, this._getCropOptions());
            this.crop.bind({
                url: this.imageSrc,
            });



        } else {
            setErrorFeedbackNode(`Please place this widget in a context that inherits from 'System.Image' entity.`, this.domNode, this.domNode);
        }
        this.runCallback(callback, "update");
    },

    _getCropOptions() {

        const options = {};
        //set view port props
        options.viewport = {};
        options.viewport.width = this.viewportWidth;
        options.viewport.height = this.viewportHeight;
        this.viewportType === "circle" && (options.viewport.type = "circle");
        this.viewportType === "square" && (options.viewport.type = "square");


        //set boundaries
        options.boundary = {};
        options.boundary.width = this.boundaryWidth;
        options.boundary.height = this.boundaryHeight;

        // toggle zoomer, resize, and orientation
        this.enableZoomer && (options.enableZoomer = this.enableZoomer);
        this.enableResize && (options.enableResize = this.enableResize);
        this.enableOrientation && (options.enableOrientation = this.enableOrientation);

        // set mouse wheel zoom option
        this.mouseWheelZoom === 'yes' && (options.mouseWheelZoom = true);
        this.mouseWheelZoom === 'yesWithCtrl' && (options.mouseWheelZoom = 'ctrl');
        this.mouseWheelZoom === 'no' && (options.mouseWheelZoom = false);


        return options;

    }
});
