import React from 'react';
import {openModal} from '@steroidsjs/core/actions/modal';
import {useBem, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {MdPlaylistAdd} from 'react-icons/md';

import LoginForm from '../../modals/LoginForm';
import AddToCollectionModal from '../../modals/AddToCollectionModal';
import './add-to-collection-button.scss';

export type TCollectionMediaType = 'game' | 'movie' | 'show';

interface IAddToCollectionButtonProps {
	mediaType: TCollectionMediaType;
	objectId: number;
	mediaName: string;
	className?: string;
}

function AddToCollectionButton(props: IAddToCollectionButtonProps) {
	const bem = useBem('add-to-collection-button');
	const dispatch = useDispatch();
	const user = useSelector(getUser);

	const onClick = () => {
		if (!user?.id) {
			dispatch(openModal(LoginForm));
			return;
		}

		dispatch(openModal(AddToCollectionModal, {
			mediaType: props.mediaType,
			objectId: props.objectId,
			mediaName: props.mediaName,
		}));
	};

	return (
		<div className={bem(bem.block(), props.className)}>
			<button
				type='button'
				className={bem.element('button')}
				onClick={onClick}
				title='Добавить в подборку'
				aria-label='Добавить в подборку'
			>
				<MdPlaylistAdd className={bem.element('icon')} aria-hidden='true' />
			</button>
		</div>
	);
}

export default AddToCollectionButton;
