import React, {useCallback, useState} from 'react';
import {Button, DropDownField, Form, InputField, TextField} from '@steroidsjs/core/ui/form';
import {useBem, useComponents, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import {formReset} from '@steroidsjs/core/actions/form';
import {goToRoute} from '@steroidsjs/core/actions/router';
import {showNotification} from '@steroidsjs/core/actions/notifications';
import {openModal} from '@steroidsjs/core/actions/modal';

import LoginForm from '../../modals/LoginForm';
import CollectionItemsEditor, {ICollectionEditableItem} from '../../shared/CollectionItemsEditor';
import {ROUTE_USER} from '../index';
import CollectionContentSearch from './CollectionContentSearch';
import './collection-create-page.scss';

const FORM_ID = 'collection_create_form';
const DISPLAY_MODE_ITEMS = [
	{id: 'mixed', label: 'Смешанная'},
	{id: 'grouped', label: 'Раздельная'},
];
const PRIVACY_ITEMS = [
	{id: 'public', label: 'Публичная'},
	{id: 'private', label: 'Приватная'},
];

function CollectionCreatePage() {
	const bem = useBem('collection-create-page');
	const {http} = useComponents();
	const dispatch = useDispatch();
	const user = useSelector(getUser);
	const formValues = useSelector(state => getFormValues(state, FORM_ID));
	const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [items, setItems] = useState<ICollectionEditableItem[]>([]);
	const title = formValues?.title?.trim() || '';
	const displayMode = formValues?.display_mode || 'mixed';

	const openProfileCollections = useCallback(() => {
		if (!user?.id) {
			return;
		}

		dispatch(goToRoute(ROUTE_USER, {
			userId: user.id,
			сategory: 'Подборки',
		}, false, true));
	}, [dispatch, user?.id]);

	const onSubmit = useCallback(async (values: Record<string, string>) => {
		setError('');
		setLoading(true);

		try {
			await http.post('/collections/', {
				title: values.title.trim(),
				description: (values.description || '').trim(),
				display_mode: values.display_mode,
				privacy: values.privacy,
				items: items.map(item => ({
					media_type: item.type,
					object_id: item.order_id,
					caption: item.caption || '',
				})),
			});
			dispatch(formReset(FORM_ID));
			dispatch(showNotification('Подборка создана!', 'success'));
			openProfileCollections();
		} catch (requestError) {
			const responseData = requestError?.response?.data;
			const errorMessage = responseData?.title?.[0]
				|| responseData?.description?.[0]
				|| responseData?.detail
				|| responseData?.error
				|| 'Не удалось создать подборку';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}, [dispatch, http, items, openProfileCollections]);

	return (
		<div className={bem.block()}>
			<div className={bem.element('body')}>
				<header className={bem.element('header')}>
					<div className={bem.element('eyebrow')}>Подборки</div>
					<h1 className={bem.element('title')}>Создать подборку</h1>
				</header>

				{!user?.id && (
					<section className={bem.element('auth-card')}>
						<p className={bem.element('auth-text')}>
							Войдите в аккаунт, чтобы создавать подборки.
						</p>
						<Button
							className={bem.element('login-button')}
							color='primary'
							onClick={() => dispatch(openModal(LoginForm))}
						>
							Войти
						</Button>
					</section>
				)}

				{!!user?.id && (
					<Form
						formId={FORM_ID}
						initialValues={{title: '', description: '', display_mode: 'mixed', privacy: 'public'}}
						onSubmit={onSubmit}
						className={bem.element('form')}
						useRedux
					>
						<div className={bem.element('field-group')}>
							<div className={bem.element('wide-field')}>
								<InputField
									attribute='title'
									label='Название'
									placeholder='Например, Любимые фантастические истории'
									className={bem.element('field')}
									inputProps={{
										autoComplete: 'off',
										autoFocus: true,
										maxLength: 200,
									}}
									required
								/>
							</div>
							<div className={bem.element('wide-field')}>
								<TextField
									attribute='description'
									label='Описание'
									placeholder='О чём эта подборка'
									className={bem.element('field')}
									inputProps={{maxLength: 2000, rows: 3}}
								/>
							</div>
							<DropDownField
								attribute='display_mode'
								label='Тип подборки'
								items={DISPLAY_MODE_ITEMS}
								className={bem.element('field')}
							/>
							<DropDownField
								attribute='privacy'
								label='Приватность'
								items={PRIVACY_ITEMS}
								className={bem.element('field')}
							/>
						</div>

						<section className={bem.element('content-section')}>
							<h2 className={bem.element('section-title')}>Контент</h2>
							<CollectionContentSearch
								selectedItems={items}
								onAdd={item => setItems(currentItems => (
									currentItems.some(currentItem => (
										currentItem.type === item.type && currentItem.order_id === item.order_id
									)) ? currentItems : [...currentItems, item]
								))}
							/>

							{items.length > 0 ? (
								<div className={bem.element('selected-items')}>
									<CollectionItemsEditor
										items={items}
										displayMode={displayMode}
										onChange={setItems}
										onRemove={item => setItems(currentItems => currentItems.filter(currentItem => (
											currentItem.type !== item.type || currentItem.order_id !== item.order_id
										)))}
									/>
								</div>
							) : (
								<div className={bem.element('content-empty')}>
									Добавленный контент появится здесь
								</div>
							)}
						</section>

						{!!error && (
							<p className={bem.element('error')}>
								{error}
							</p>
						)}

						<div className={bem.element('actions')}>
							<Button
								type='button'
								className={bem.element('cancel-button')}
								color='secondary'
								onClick={openProfileCollections}
							>
								Отмена
							</Button>
							<Button
								type='submit'
								className={bem.element('submit-button')}
								color='primary'
								disabled={!title || isLoading}
							>
								{isLoading ? 'Создаём...' : 'Создать подборку'}
							</Button>
						</div>
					</Form>
				)}
			</div>
		</div>
	);
}

export default CollectionCreatePage;
