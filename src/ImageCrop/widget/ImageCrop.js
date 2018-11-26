import {
    defineWidget,
    log,
    runCallback,
} from 'widget-base-helpers';

import widgetTemplate from "./ImageCrop.template.html";

export default defineWidget('ImageCrop', widgetTemplate, {

    _obj: null,

    constructor() {
        this.log = log.bind(this);
        this.runCallback = runCallback.bind(this);
    },

    postCreate() {
        log.call(this, 'postCreate', this._WIDGET_VERSION);
    },
});
