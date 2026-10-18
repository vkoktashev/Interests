import {useCallback, useEffect, useRef, useState} from 'react';
import {isEqual} from 'lodash-es';

export default function useSavedValues<T>(initialValues: T, identity?: string) {
    const [savedValues, setSavedValues] = useState(initialValues);
    const previousInitial = useRef(initialValues);
    const previousIdentity = useRef(identity);
    useEffect(() => {
        if (previousIdentity.current !== identity || !isEqual(previousInitial.current, initialValues)) {
            previousIdentity.current = identity;
            previousInitial.current = initialValues;
            setSavedValues(initialValues);
        }
    }, [initialValues, identity]);
    const markSaved = useCallback((values: T) => setSavedValues(values), []);
    return {savedValues, markSaved};
}
