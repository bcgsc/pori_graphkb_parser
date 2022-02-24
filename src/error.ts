/** @module app/error */
import jc from 'json-cycle';

/**
 * @property {string} message the error message
 * @property {string} name the error name (generally the same as the error class)
 * @property {string} stack the stack trace associated with this error
 * @property {Object} content additional properties assigned to the error to aid in debugging
 */
class ErrorMixin extends Error {
    message: string;

    name: string;

    content: object;

    stack?: string;

    /**
     * @param {Object|string} content the content to add to the error
     * @param {string} content.message if content is an object, it should include a property message
     */
    constructor(content) {
        let message;

        if (typeof content === 'object' && content !== null) {
            ({ message, ...content } = content);
        } else {
            message = content;
            content = {};
        }
        super(message);
        this.message = message;
        this.name = this.constructor.name;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this);
        }
        this.content = content;
    }

    /**
     * @return {Object} the JSON representation of this error
     */
    toJSON() {
        return jc.decycle(Object.assign(this.content, {
            message: this.message,
            name: this.name,
            stacktrace: Array.from((this.stack || '').split('\n'), (line) => line.trim()),
        }));
    }
}

class ParsingError extends ErrorMixin {}

class InputValidationError extends ErrorMixin {}

export { ParsingError, ErrorMixin, InputValidationError };
