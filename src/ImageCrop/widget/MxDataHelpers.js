/*  
 *  checks if the widget is placed in a entity/context inherits from 'System.Image'
 */
export const isMxImageContext = (contextObject) => {
    if (contextObject) {
        return contextObject.hasSuperEntities() &&
            contextObject.getSuperEntities().indexOf('System.Image') !== -1 &&
            contextObject.getSuperEntities().indexOf('System.FileDocument') !== -1;
    }
    return false;
};
