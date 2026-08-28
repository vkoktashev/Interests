import React, {useMemo, useState} from 'react';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';
import {Button} from '@steroidsjs/core/ui/form';
import {Loader} from '@steroidsjs/core/ui/layout';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {useBem, useComponents, useDispatch, useFetch} from '@steroidsjs/core/hooks';

import {ROUTE_COLLECTION_CREATE} from '../../routes';
import type {TCollectionMediaType} from '../../shared/AddToCollectionButton';
import './add-to-collection-modal.scss';

interface ICollectionListItem {
	id: number;
	title: string;
	contains_item: boolean;
}

interface IAddToCollectionModalProps extends IModalProps {
	mediaType: TCollectionMediaType;
	objectId: number;
	mediaName: string;
}

function AddToCollectionModal(props: IAddToCollectionModalProps) {
	const bem = useBem('add-to-collection-modal');
	const {http} = useComponents();
	const dispatch = useDispatch();
	const [loadingCollectionId, setLoadingCollectionId] = useState<number>();
	const [addError, setAddError] = useState('');
	const fetchConfig = useMemo(() => ({
		url: `/collections/?media_type=${props.mediaType}&object_id=${props.objectId}`,
		method: 'get',
	}), [props.objectId, props.mediaType]);
	const {data, isLoading, axiosError, fetch} = useFetch(fetchConfig as any);
	const collections = (data || []) as ICollectionListItem[];

	const addToCollection = async (collection: ICollectionListItem) => {
		setAddError('');
		setLoadingCollectionId(collection.id);

		try {
			await http.post(`/collections/${collection.id}/add_item/`, {
				media_type: props.mediaType,
				object_id: props.objectId,
			});
			await fetch();
			dispatch(showNotification(`Добавлено в подборку «${collection.title}»`, 'success'));
		} catch (requestError) {
			const responseData = requestError?.response?.data;
			setAddError(responseData?.error || responseData?.detail || 'Не удалось добавить в подборку');
		} finally {
			setLoadingCollectionId(undefined);
		}
	};

	const openCollectionCreatePage = () => {
		props.onClose();
		dispatch(goToRoute(ROUTE_COLLECTION_CREATE));
	};

	return (
		<Modal
			{...props}
			size='sm'
			title='Добавить в подборку'
			className={bem.block()}
			onClose={props.onClose}
		>
			<div className={bem.element('body')}>
				<div className={bem.element('media-name')}>{props.mediaName}</div>

				{!!addError && (
					<div className={bem.element('error')}>{addError}</div>
				)}

				{isLoading && !data ? (
					<div className={bem.element('state')}><Loader /></div>
				) : axiosError ? (
					<div className={bem.element('state')}>Не удалось загрузить подборки</div>
				) : collections.length > 0 ? (
					<div className={bem.element('list')}>
						{collections.map(collection => (
							<div className={bem.element('row')} key={collection.id}>
								<span className={bem.element('collection-title')}>{collection.title}</span>
								<Button
									className={bem.element('add-button')}
									size='sm'
									color={collection.contains_item ? 'secondary' : 'primary'}
									disabled={collection.contains_item || loadingCollectionId !== undefined}
									onClick={() => addToCollection(collection)}
								>
									{collection.contains_item
										? 'Добавлено'
										: (loadingCollectionId === collection.id ? 'Добавляем...' : 'Добавить')}
								</Button>
							</div>
						))}
					</div>
				) : (
					<div className={bem.element('state')}>
						У вас пока нет подборок
					</div>
				)}

				<div className={bem.element('footer')}>
					<Button
						className={bem.element('create-button')}
						color='secondary'
						onClick={openCollectionCreatePage}
					>
						Создать новую подборку
					</Button>
				</div>
			</div>
		</Modal>
	);
}

export default AddToCollectionModal;
