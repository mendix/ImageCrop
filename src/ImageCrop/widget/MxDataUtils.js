/**
 * checks if the given mxObject inherits from 'System.Image' Entity.
 * @param {MxObject} mxObject
 * @returns {boolean} returns true is if the given mxObject inherits from 'System.Image' Entity,
 * or returns false  otherwise or in case mxObject is 'undefined'. 
 */
export const isMxImageObject = (mxObject) => {
    if (mxObject) {
        return mxObject.hasSuperEntities() &&
            mxObject.getSuperEntities().indexOf('System.Image') !== -1 &&
            mxObject.getSuperEntities().indexOf('System.FileDocument') !== -1;

    }
    return false;
};
