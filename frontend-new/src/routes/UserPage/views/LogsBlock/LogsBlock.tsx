import React, {useCallback, useEffect, useState} from 'react';
import Pagination from "rc-pagination";
import { FaAngleDown, FaAngleUp } from "react-icons/fa";
import {useBem, useDispatch, useSelector} from '@steroidsjs/core/hooks';
import {getUser} from '@steroidsjs/core/reducers/auth';
import {DropDownField, Form, InputField} from '@steroidsjs/core/ui/form';
import {formChange, formSubmit} from '@steroidsjs/core/actions/form';
import {getFormValues} from '@steroidsjs/core/reducers/form';
import LogsByDay from "./LogsByDay/LogsByDay";
import useWindowDimensions from '../../../../hooks/useWindowDimensions';
import "./LogsBlock.scss";

interface ILogsBlockProps {
	logs: {count: 0, log: []},
	showUsername?: boolean,
	onDeleteLog: (logType: string, logId: number) => void,
	formId: string,
	onFormSubmit: (values: any) => void,
	className?: string,
}

function LogsBlock(props: ILogsBlockProps) {
	const bem = useBem('LogsBlock');
	const dispatch = useDispatch();
	const formValues = useSelector(state => getFormValues(state, props.formId));
	const currentUser = useSelector(getUser);
	const [collapse, setCollapse] = useState(true);
	const { width } = useWindowDimensions();

	const toggleCollapse = () => {
		setCollapse(!collapse);
	};

	useEffect(() => {
		dispatch(formSubmit(props.formId));
	}, []);

	const onChange = useCallback(() => {
		dispatch(formSubmit(props.formId));
	}, []);

	return (
		<div className={bem(bem.block(), props.className)}>
			<Form
				formId={props.formId}
				initialValues={{
					page: 1,
					page_size: 25,
				}}
				onSubmit={props.onFormSubmit}
				onChange={onChange}
				useRedux
			>
				<div className='LogsBlock__header'>
						<div className='LogsBlock__header-left'>
							<div className='LogsBlock__header-first-row'>
									<InputField
										attribute='query'
										placeholder='Поиск'
										label={__('Поиск')}
										aria-label='Поиск'
										className='LogsBlock__search-input'
									/>
								<button
									className='LogsBlock__mobile-expand'
									onClick={toggleCollapse}
								>
									{collapse
										? <FaAngleDown />
										: <FaAngleUp />}
								</button>
							</div>

							<DropDownField
								attribute='filters'
								label={"Тип логов"}
								items={[
									{ id: "game", label: "Игры" },
									{ id: "movie", label: "Фильмы" },
									{ id: "show", label: "Сериал" },
									{ id: "user", label: "Пользователи" },
								]}
								multiple
								showReset
								hidden={collapse && width < 748}
								className={bem.element('dropdown')}
							/>
						</div>
						<div className='LogsBlock__page-size' hidden={collapse && width < 748}>
							<DropDownField
								attribute='page_size'
								label={__('Записей на странице')}
								items={[5, 10, 25, 50, 100].map(item => ({id: item, label: item}))}
							/>
						</div>
				</div>
			</Form>
			<LogsByDay
				logs={props.logs}
				showUsername={!!props.showUsername}
				currentUser={currentUser}
				onDeleteLog={props.onDeleteLog}
			/>
			<Pagination
				total={props.logs.count}
				pageSize={formValues?.page_size}
				onChange={(e) => {
					dispatch(formChange(props.formId, 'page', e));
				}}
				current={formValues?.page}
			/>
		</div>
	);
}

export default LogsBlock;
