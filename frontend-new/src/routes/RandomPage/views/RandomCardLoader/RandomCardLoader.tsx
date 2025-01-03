import * as React from 'react';
import ContentLoader from 'react-content-loader';
import './RandomCardLoader.scss';
import {useBem} from '@steroidsjs/core/hooks';

interface IRandomCardLoaderProps {
    className?: string,
}

function RandomCardLoader(props: IRandomCardLoaderProps) {
    const bem = useBem('RandomCardLoader');

    return (
        <div className={bem(bem.block(), props.className)}>
            <ContentLoader
                speed={2}
                width={700}
                height={300}
                viewBox="0 0 710 300"
                backgroundColor="#3f4041"
                foregroundColor="#525252"
                {...props}
            >
                <rect x="0" y="0" rx="15" ry="15" width="400" height="300" />
                <rect x="420" y="0" rx="15" ry="15" width="280" height="25" />
            </ContentLoader>
        </div>
    );
}

export default RandomCardLoader;
