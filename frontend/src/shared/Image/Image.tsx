import * as React from 'react';

import './Image.scss';
import {useCallback, useEffect, useState} from 'react';
import axios from 'axios';

function Image(props: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>) {
    const [dataUrl, setDataUrl] = useState(null);
    const [isLoading, setLoading] = useState(false);

    const loadImage = useCallback(async () => {
        if (!props.src || isLoading) {
            return;
        }
        setLoading(true);
        try {
            const response = await axios
                .get(props.src, {
                    responseType: 'arraybuffer',
                    headers:{
                        Origin: 'https://developer.themoviedb.org/',
                    },
                });

            const base64 = Buffer.from(response.data, 'binary').toString('base64');

            setDataUrl(`data:image/png;base64,${base64}`);
        } finally {
            setLoading(false);
        }
    }, [props.src, isLoading]);

    useEffect(() => {
        loadImage();
    }, [props.src]);

    return (
        <img {...props} src={dataUrl} alt={props.alt} />
    );
}

export default Image;
