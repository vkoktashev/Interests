import * as React from 'react';
import { block } from 'bem-cn';
import './Button.scss';
import {compact} from 'lodash';

interface IButtonProps extends React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
    > {
    label?: string,
}

function Button(props: IButtonProps) {
    const bem = block('Button');

    return (
        <button
            className={compact([bem(), props.className]).join(' ')}
            {...props}
        >
            {props.label}
        </button>
    );
}

export default Button;
