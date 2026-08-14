import { FormBuilder } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { handleSubmissionError } from './case-submission.helper';


describe('handleSubmissionError', () => {

    const fb = new FormBuilder();

    function createForm() {
        return fb.group({
            fName: [''],
            age: [null],
        });
    }


    it('should return fallback message for unknown error', () => {

        const result = handleSubmissionError(
            {},
            createForm(),
            'Default error'
        );

        expect(result.message).toBe('Default error');
        expect(result.mediaErrors).toBeNull();

    });


    it('should extract backend message', () => {

        const error = {
            error: {
                message: 'حدث خطأ من السيرفر'
            }
        };

        const result = handleSubmissionError(
            error,
            createForm()
        );

        expect(result.message)
            .toBe('حدث خطأ من السيرفر');

        expect(result.mediaErrors)
            .toBeNull();

    });


    it('should handle backend validation errors and map fields', () => {

        const error = {
            error: {
                errors: {
                    FName: [
                        'الاسم مطلوب'
                    ]
                }
            }
        };

        const form = createForm();

        const result = handleSubmissionError(
            error,
            form
        );

        expect(result.message)
            .toBe('الاسم مطلوب');

        expect(result.mediaErrors)
            .toBeNull();

        expect(form.get('fName')?.errors?.['server'])
            .toBe('الاسم مطلوب');

    });


    it('should return media errors when backend returns media validation errors', () => {

        const error = {
            error: {
                errors: {
                    PrimaryImage: [
                        'الصورة الأساسية مطلوبة'
                    ]
                }
            }
        };


        const result = handleSubmissionError(
            error,
            createForm()
        );


        expect(result.mediaErrors)
            .not.toBeNull();


        expect(result.mediaErrors?.primary)
            .toBe('الصورة الأساسية مطلوبة');


    });


    it('should keep backend message unchanged for normal server message', () => {

        const backendMessage =
            'الصورة لا تبدو لنفس الشخص';


        const error = {
            error: {
                message: backendMessage
            }
        };


        const result = handleSubmissionError(
            error,
            createForm()
        );


        expect(result.message)
            .toBe(backendMessage);


        expect(result.mediaErrors)
            .toBeNull();

    });


    it('should handle multiple validation fields', () => {

        const error = {
            error: {
                errors: {
                    FName: [
                        'الاسم مطلوب'
                    ],
                    Age: [
                        'العمر غير صحيح'
                    ]
                }
            }
        };


        const form = createForm();


        const result = handleSubmissionError(
            error,
            form
        );


        expect(result.message)
            .toContain('الاسم مطلوب');


        expect(form.get('fName')?.errors?.['server'])
            .toBe('الاسم مطلوب');

    });


    it('should classify validation errors correctly', () => {

        const error = {
            error: {
                errors: {
                    FName: [
                        'الاسم مطلوب'
                    ]
                }
            }
        };


        const result = handleSubmissionError(
            error,
            createForm()
        );


        expect(result.type)
            .toBe('validation');

    });


    it('should return unknown type for non validation errors', () => {

        const result = handleSubmissionError(
            {
                error: {
                    message: 'حدث خطأ'
                }
            },
            createForm()
        );


        expect(result.type)
            .toBe('unknown');

    });

});