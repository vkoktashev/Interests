import React, {useMemo} from 'react';
import {useBem, useFetch} from '@steroidsjs/core/hooks';
import {Loader} from '@steroidsjs/core/ui/layout';
import Modal from '@steroidsjs/core/ui/modal/Modal';
import {IModalProps} from '@steroidsjs/core/ui/modal/Modal/Modal';

import PersonLink from '../../shared/PersonLink';
import {IPersonalityScoreStat} from '../../routes/UserPage/views/StatisticsBlock/types';

import './personality-top-modal.scss';

export type TPersonalityTopType = 'actors' | 'directors' | 'studios';

interface IPersonalityTopResponse {
	results: IPersonalityScoreStat[];
}

interface IPersonalityTopModalProps extends IModalProps {
	userId: number;
	topType: TPersonalityTopType;
	title: string;
	emptyLabel: string;
	withPersonLinks?: boolean;
}

export default function PersonalityTopModal(props: IPersonalityTopModalProps) {
	const bem = useBem('personality-top-modal');
	const fetchConfig = useMemo(() => ({
		url: `/analytics/users/${props.userId}/top-personalities/?type=${props.topType}`,
		method: 'get',
	}), [props.topType, props.userId]);
	const {data, isLoading, axiosError} = useFetch(fetchConfig as any);
	const results = ((data as IPersonalityTopResponse)?.results || []);

	return (
		<Modal
			{...props}
			size='md'
			title={props.title}
			className={bem.block()}
			onClose={props.onClose}
		>
			<div className={bem.element('body')}>
				{isLoading && !data ? (
					<div className={bem.element('state')}><Loader /></div>
				) : axiosError ? (
					<div className={bem.element('state')}>Не удалось загрузить рейтинг</div>
				) : results.length > 0 ? (
					<div className={bem.element('list')}>
						{results.map((item, index) => (
							<div className={bem.element('row')} key={`${item.id || item.name}-${index}`}>
								<span className={bem.element('position')}>{index + 1}</span>
								<div className={bem.element('name')}>
									{props.withPersonLinks && item.id ? (
										<div onClick={props.onClose}>
											<PersonLink id={item.id} name={item.name} />
										</div>
									) : item.name}
								</div>
								<span className={bem.element('points')}>{item.points} баллов</span>
							</div>
						))}
					</div>
				) : (
					<div className={bem.element('state')}>{props.emptyLabel}</div>
				)}
			</div>
		</Modal>
	);
}
