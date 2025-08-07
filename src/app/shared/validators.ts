import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';



export function containsLetter(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.value;
    const letterRegex = /\p{L}/u;
    return letterRegex.test(newPassword) ? null : { containsLetter: true };
}

export function noSpacesAllowed(control: AbstractControl): ValidationErrors | null {
    if (control.value && control.value.includes(' ')) {
        return { noSpacesAllowed: true };
    }
    return null;
}

export function emailWithDotValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const email = control.value;
        // Check if the email contains '@' and a '.' after '@'
        const atIndex = email?.indexOf('@');
        const dotAfterAt = email?.indexOf('.', atIndex);

        // Ensure there is an '@' and that there is a '.' after '@'
        if (email && (atIndex === -1 || dotAfterAt === -1)) {
            return { emailDot: true };
        }

        return null;
    };
}

export function validatePhoneNumber(control: AbstractControl): { [key: string]: any } | null {
    const valid = control.value && control.value.e164Number;
    return valid ? null : { validatePhoneNumber: { valid: false } };
}

export function specialCharacter(control: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = control.value;
    const specialCharacterRegex = /[!@#$%^&*(),.?":{}|<>_~]/;

    if (!newPassword || !specialCharacterRegex.test(newPassword)) {
        return { 'specialCharacter': true };
    }

    return null;
}

export function containsNumber(control: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = control.value;
    const numberRegex = /\d/;

    if (!newPassword || !numberRegex.test(newPassword)) {
        return { 'containsNumber': true };
    }

    return null;
}

export function noSpaceAllowed(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.value;
    const hasSpace = /\s/;
    return hasSpace.test(newPassword) ? { noSpaceAllowed: true } : null;
}

export function emailNoArabicValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const email = control.value;
      // Regular expression to check for non-ASCII characters (e.g., Arabic)
      const nonAsciiRegex = /[^\x00-\x7F]/;

      if (email && nonAsciiRegex.test(email)) {
        return { noArabicAllowed: true };
      }
      return null;
    };
  }

