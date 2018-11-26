import {
    get as domAttrGet,
    set as domAttrSet
} from "dojo/dom-attr";
import {
    query as domQuery
} from "dojo/query";
import {
    create as domCreate,
    place as domPlace
} from "dojo/dom-construct";

/**
 * A node in the DOM tree.
 * @external Element
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Element Element}
 */
/**
 * Appends/Updates an alert node of type error with an error feedback message.
 * @param {string} errorMessage a friendly error message will be displayed to the user,
 * telling what is wrong with the widget.
 * @param {Element} parentNode the dom element to which has/will have the error feedback message.
 * @param {Element} domScope the dom scope in which the method will look for any existing erro feedback messages.  
 */
export const setErrorFeedbackNode = (errorMessage, parentNode, domScope) => {
    let errorMessageNode = domQuery(".alert .alert-danger", domScope)[0];
    if (errorMessageNode) {
        domAttrSet(errorMessageNode, "innerHTML", errorMessage);
    } else {
        errorMessageNode = domCreate("div", {
            class: "alert alert-danger",
            innerHTML: errorMessage
        });
        const parentNodeNextClass = `${domAttrGet(parentNode, "class")} has-error`;
        domAttrSet(parentNode, "class", parentNodeNextClass);
        domPlace(errorMessageNode, parentNode);
    }
};
